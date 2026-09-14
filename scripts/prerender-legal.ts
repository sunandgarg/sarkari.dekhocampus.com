import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createServer } from "vite";
import { SITE_URL } from "../src/lib/constant";
import {
  SARKARI_LEGAL_PAGES,
  getSarkariLegalJsonLd,
  sarkariLegalShellPath,
  type SarkariLegalSlug,
} from "../src/lib/sarkariLegal";
import {
  HOME_PRERENDER_ATTRIBUTE,
  legalPrerenderValue,
  restoreBlockingStylesheetFromHomeCriticalCss,
  stripHomePrerenderFromHtml,
} from "../src/lib/homePrerender";

const projectRoot = resolve(import.meta.dirname, "..");
const distDir = resolve(projectRoot, "dist");
const indexPath = resolve(distDir, "index.html");
const versionPath = resolve(distDir, "version.json");

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function replaceRequired(html: string, pattern: RegExp, replacement: string, label: string) {
  const matches = html.match(pattern) || [];
  if (matches.length !== 1) {
    throw new Error(`Expected one ${label} in the legal shell, found ${matches.length}`);
  }
  return html.replace(pattern, replacement);
}

function metaPattern(attribute: "name" | "property", value: string) {
  return new RegExp(`<meta\\b(?=[^>]*\\b${attribute}=["']${value}["'])[^>]*>`, "gi");
}

function buildLegalDocument(
  shell: string,
  page: (typeof SARKARI_LEGAL_PAGES)[number],
  markup: string,
) {
  const canonical = `${SITE_URL}${page.path}`;
  const fullTitle = `${page.title} | Sarkari DekhoCampus`;
  const prerenderMarker = legalPrerenderValue(page.path);
  let html = replaceRequired(
    shell,
    /<div id="root"><\/div>/g,
    `<div id="root" ${HOME_PRERENDER_ATTRIBUTE}="${escapeHtml(prerenderMarker)}">${markup}</div>`,
    "empty application root",
  );
  html = replaceRequired(html, /<title>[^<]*<\/title>/gi, `<title>${escapeHtml(fullTitle)}</title>`, "document title");
  html = replaceRequired(html, metaPattern("name", "description"), `<meta name="description" content="${escapeHtml(page.description)}">`, "meta description");
  html = replaceRequired(html, metaPattern("name", "robots"), '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">', "robots meta");
  html = replaceRequired(html, /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/gi, `<link rel="canonical" href="${canonical}">`, "canonical link");
  html = replaceRequired(html, metaPattern("property", "og:url"), `<meta property="og:url" content="${canonical}">`, "Open Graph URL");
  html = replaceRequired(html, metaPattern("property", "og:title"), `<meta property="og:title" content="${escapeHtml(fullTitle)}">`, "Open Graph title");
  html = replaceRequired(html, metaPattern("property", "og:description"), `<meta property="og:description" content="${escapeHtml(page.description)}">`, "Open Graph description");
  html = replaceRequired(html, metaPattern("name", "twitter:url"), `<meta name="twitter:url" content="${canonical}">`, "Twitter URL");
  html = replaceRequired(html, metaPattern("name", "twitter:title"), `<meta name="twitter:title" content="${escapeHtml(fullTitle)}">`, "Twitter title");
  html = replaceRequired(html, metaPattern("name", "twitter:description"), `<meta name="twitter:description" content="${escapeHtml(page.description)}">`, "Twitter description");

  const webPageSchema = JSON.stringify(getSarkariLegalJsonLd(page)).replace(/</g, "\\u003c");
  html = replaceRequired(
    html,
    /<\/head>/gi,
    `  <script id="ld-json-page" type="application/ld+json">${webPageSchema}</script>\n</head>`,
    "closing head tag",
  );

  if (!html.includes(`<link rel="canonical" href="${canonical}">`)) throw new Error(`Canonical URL missing for ${page.path}`);
  if (!html.includes(`${HOME_PRERENDER_ATTRIBUTE}="${escapeHtml(prerenderMarker)}"`)) {
    throw new Error(`Route-matched hydration marker missing for ${page.path}`);
  }
  if (!html.includes(`<h1>${escapeHtml(page.title)}</h1>`)) throw new Error(`Legal h1 missing for ${page.path}`);
  if ((html.match(/<main\b/g) || []).length !== 1) throw new Error(`Expected one main element for ${page.path}`);
  if ((html.match(/<h1\b/g) || []).length !== 1) throw new Error(`Expected one h1 element for ${page.path}`);
  if (/meta\b(?=[^>]*name=["']robots["'])[^>]*noindex/i.test(html)) throw new Error(`Legal shell is noindex for ${page.path}`);
  if (html.includes("SARKARI_HOME_PRERENDER_") || html.includes("data-sarkari-home-critical")) {
    throw new Error(`Homepage-only markup leaked into ${page.path}`);
  }
  const stylesheets = html.match(/<link\b(?=[^>]*\brel=["']stylesheet["'])[^>]*>/gi) || [];
  if (stylesheets.length !== 1 || /\b(?:media|blocking|onload)=/i.test(stylesheets[0])) {
    throw new Error(`Legal shell does not have one ordinary blocking stylesheet for ${page.path}`);
  }
  return html;
}

const builtIndex = readFileSync(indexPath, "utf8");
const compactShell = restoreBlockingStylesheetFromHomeCriticalCss(stripHomePrerenderFromHtml(builtIndex));
const version = JSON.parse(readFileSync(versionPath, "utf8")) as { buildYear?: number };
if (!Number.isInteger(version.buildYear)) throw new Error("Client build year is missing");
process.env.SARKARI_BUILD_YEAR = String(version.buildYear);

const originalNodeEnv = process.env.NODE_ENV;
let vite: Awaited<ReturnType<typeof createServer>> | undefined;
try {
  process.env.NODE_ENV = "development";
  vite = await createServer({
    root: projectRoot,
    mode: "production",
    appType: "custom",
    logLevel: "error",
    server: { middlewareMode: true, hmr: false },
  });
  const entry = await vite.ssrLoadModule("/src/entry-server.tsx") as {
    renderLegalPrerender?: (slug: SarkariLegalSlug) => string | Promise<string>;
  };
  if (typeof entry.renderLegalPrerender !== "function") {
    throw new Error("SSR entry does not export renderLegalPrerender");
  }

  for (const page of SARKARI_LEGAL_PAGES) {
    const markup = await entry.renderLegalPrerender(page.slug);
    if (!/^(?:<!--\$-->)?<div class="sarkari-site">/.test(markup)) {
      throw new Error(`Legal SSR returned an unexpected root for ${page.path}`);
    }
    const outputPath = resolve(distDir, sarkariLegalShellPath(page.slug).slice(1));
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, buildLegalDocument(compactShell, page, markup));
  }
  console.log(`[legal-prerender] rendered ${SARKARI_LEGAL_PAGES.length} canonical legal documents`);
} finally {
  await vite?.close();
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
}
