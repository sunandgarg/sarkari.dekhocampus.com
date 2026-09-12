import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { createServer } from "vite";
import {
  ARTICLE_SHELL_PATH,
  HOME_PRERENDER_PLACEHOLDER,
  stripHomePrerenderFromHtml,
} from "../src/lib/homePrerender";

const projectRoot = resolve(import.meta.dirname, "..");
const indexPath = resolve(projectRoot, "dist/index.html");
const articleShellPath = resolve(projectRoot, "dist", basename(ARTICLE_SHELL_PATH));
const versionPath = resolve(projectRoot, "dist/version.json");

const sourceHtml = readFileSync(indexPath, "utf8");
const placeholderCount = sourceHtml.split(HOME_PRERENDER_PLACEHOLDER).length - 1;
if (placeholderCount !== 1) {
  throw new Error(`Expected one homepage prerender placeholder, found ${placeholderCount}`);
}

// Articles use a compact, non-prerendered copy instead of downloading and
// parsing the larger homepage on every uncached edge request.
const articleShell = stripHomePrerenderFromHtml(sourceHtml);
writeFileSync(articleShellPath, articleShell);

const version = JSON.parse(readFileSync(versionPath, "utf8")) as { buildYear?: number };
if (!Number.isInteger(version.buildYear)) throw new Error("Client build year is missing");
// Vite's SSR loader runs after the client build. Pin it to the year emitted by
// that exact client build so a New Year boundary cannot create a mismatch.
process.env.SARKARI_BUILD_YEAR = String(version.buildYear);

const originalNodeEnv = process.env.NODE_ENV;
let vite: Awaited<ReturnType<typeof createServer>> | undefined;
try {
  // The SWC middleware transform emits jsxDEV for this in-process SSR load.
  // Pin the matching React development runtime even when CI inherits
  // NODE_ENV=production; Vite's explicit mode remains production.
  process.env.NODE_ENV = "development";
  vite = await createServer({
    root: projectRoot,
    mode: "production",
    appType: "custom",
    logLevel: "error",
    server: { middlewareMode: true, hmr: false },
  });
  const entry = await vite.ssrLoadModule("/src/entry-server.tsx") as {
    renderHomePrerender?: () => string | Promise<string>;
  };
  if (typeof entry.renderHomePrerender !== "function") {
    throw new Error("SSR entry does not export renderHomePrerender");
  }
  const markup = await entry.renderHomePrerender();
  if (!/^(?:<!--\$-->)?<div class="sarkari-site">/.test(markup)) {
    throw new Error("Homepage SSR returned an unexpected root");
  }
  const withPrerender = sourceHtml.replace(HOME_PRERENDER_PLACEHOLDER, markup);
  const homeNoscript = /\s*<noscript>\s*<main>[\s\S]*?<\/main>\s*<\/noscript>/i;
  if ((withPrerender.match(new RegExp(homeNoscript.source, "gi")) || []).length !== 1) {
    throw new Error("Expected one generic homepage noscript fallback");
  }
  // The real SSR tree is already complete without JavaScript. Keep the
  // generic fallback only in the compact article shell, where the edge
  // renderer replaces it with article-specific crawlable content.
  writeFileSync(indexPath, withPrerender.replace(homeNoscript, ""));
  console.log(`[home-prerender] rendered ${Buffer.byteLength(markup)} bytes; compact article shell ${Buffer.byteLength(articleShell)} bytes`);
} finally {
  await vite?.close();
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
}
