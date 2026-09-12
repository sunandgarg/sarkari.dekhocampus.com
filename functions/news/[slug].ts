import {
  PUBLIC_ARTICLE_DETAIL_FIELDS,
  SARKARI_ARTICLE_BOOTSTRAP_ID,
  isPublishedArticleStatus,
  normalizeSarkariArticleSlug,
  serializeSarkariArticleBootstrap,
  validatePublicSarkariArticle,
  type PublicSarkariArticle,
} from "../../src/lib/sarkariArticleBootstrap";

const SITE_URL = "https://sarkari.dekhocampus.com";
const DEFAULT_API_URL = "https://aws-origin.dekhocampus.com";
const BRAND_IMAGE = `${SITE_URL}/icon-512.png`;
const ARTICLE_BODY_CHAR_LIMIT = 12_000;
const MAX_UPSTREAM_ARTICLE_BYTES = 2_000_000;

type Env = {
  API_URL?: string;
  VITE_API_URL?: string;
  ASSETS: {
    fetch(input: Request | string | URL, init?: RequestInit): Promise<Response>;
  };
};

type ArticleRow = PublicSarkariArticle;

type PagesContext = {
  request: Request;
  env: Env;
  params: { slug?: string | string[] };
  waitUntil(promise: Promise<unknown>): void;
};

type EdgeCache = {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function plainText(value: unknown) {
  return String(value ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export const normalizeArticleSlug = normalizeSarkariArticleSlug;

function removeMeta(html: string, attribute: "name" | "property", value: string) {
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<meta\\b(?=[^>]*\\b${attribute}\\s*=\\s*["']${escapedValue}["'])[^>]*>\\s*`,
    "gi",
  );
  return html.replace(pattern, "");
}

function articleDescription(article: ArticleRow) {
  return plainText(article.meta_description || article.description || `${article.title} government update on Sarkari DekhoCampus.`).slice(0, 300);
}

function articleImage(article: ArticleRow) {
  const candidate = String(article.featured_image || "").trim();
  return /^https:\/\//i.test(candidate) ? candidate : BRAND_IMAGE;
}

export function renderArticleHtml(template: string, article: ArticleRow) {
  const slug = normalizeArticleSlug(article.slug);
  const canonical = `${SITE_URL}/news/${encodeURIComponent(slug)}`;
  const rawTitle = plainText(article.meta_title || article.title);
  const titleText = (rawTitle.includes("DekhoCampus") ? rawTitle : `${rawTitle} | Sarkari DekhoCampus`).slice(0, 180);
  const descriptionText = articleDescription(article);
  const image = articleImage(article);
  const category = plainText(article.category || "Government update");
  const author = plainText(article.author || "Sarkari DekhoCampus Desk");
  const tags = Array.isArray(article.tags) ? article.tags.map(plainText).filter(Boolean) : [];
  const articleBody = plainText(article.content || article.description || "").slice(0, ARTICLE_BODY_CHAR_LIMIT);
  const schema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: plainText(article.title).slice(0, 220),
    description: descriptionText,
    articleBody,
    image: [image],
    datePublished: article.created_at || undefined,
    dateModified: article.updated_at || article.created_at || undefined,
    articleSection: category,
    keywords: tags.length ? tags.join(", ") : undefined,
    author: { "@type": "Person", name: author },
    publisher: {
      "@type": "Organization",
      name: "Sarkari DekhoCampus",
      logo: { "@type": "ImageObject", url: BRAND_IMAGE, width: 512, height: 512 },
    },
    mainEntityOfPage: canonical,
  };

  let html = template.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(titleText)}</title>`);
  html = html.replace(/<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>\s*/gi, "");
  for (const name of ["description", "keywords", "robots", "twitter:card", "twitter:title", "twitter:description", "twitter:url", "twitter:image", "twitter:image:alt"]) {
    html = removeMeta(html, "name", name);
  }
  for (const property of ["og:type", "og:title", "og:description", "og:url", "og:image", "og:image:alt"]) {
    html = removeMeta(html, "property", property);
  }
  html = html.replace(/<script\b[^>]*id=["']ld-json-page["'][^>]*>[\s\S]*?<\/script>\s*/gi, "");

  const metadata = [
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    `<meta name="description" content="${escapeHtml(descriptionText)}">`,
    ...(tags.length ? [`<meta name="keywords" content="${escapeHtml(tags.join(", "))}">`] : []),
    '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">',
    '<meta property="og:type" content="article">',
    `<meta property="og:title" content="${escapeHtml(titleText)}">`,
    `<meta property="og:description" content="${escapeHtml(descriptionText)}">`,
    `<meta property="og:url" content="${escapeHtml(canonical)}">`,
    `<meta property="og:image" content="${escapeHtml(image)}">`,
    `<meta property="og:image:alt" content="${escapeHtml(article.title)}">`,
    `<meta name="twitter:card" content="${image === BRAND_IMAGE ? "summary" : "summary_large_image"}">`,
    `<meta name="twitter:title" content="${escapeHtml(titleText)}">`,
    `<meta name="twitter:description" content="${escapeHtml(descriptionText)}">`,
    `<meta name="twitter:url" content="${escapeHtml(canonical)}">`,
    `<meta name="twitter:image" content="${escapeHtml(image)}">`,
    `<meta name="twitter:image:alt" content="${escapeHtml(article.title)}">`,
    `<script id="ld-json-page" type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`,
  ].join("\n    ");

  html = html.replace(/<\/head>/i, `    ${metadata}\n  </head>`);
  const noScriptArticle = `<noscript><main><article><p>${escapeHtml(category)}</p><h1>${escapeHtml(article.title)}</h1><p>${escapeHtml(descriptionText)}</p>${articleBody ? `<p>${escapeHtml(articleBody)}</p>` : ""}<p>Verify dates, eligibility and application instructions on the official authority website.</p><a href="${escapeHtml(canonical)}">Open this Sarkari DekhoCampus update</a></article></main></noscript>`;
  html = html.replace(/<noscript>\s*<main>[\s\S]*?<\/main>\s*<\/noscript>/i, noScriptArticle);
  const bootstrap = `<script id="${SARKARI_ARTICLE_BOOTSTRAP_ID}" type="application/json">${serializeSarkariArticleBootstrap(article)}</script>`;
  html = html.replace(/<\/body>/i, `${bootstrap}\n</body>`);
  return html;
}

function htmlHeaders(source?: Headers) {
  const headers = new Headers(source);
  headers.set("Content-Type", "text/html; charset=utf-8");
  if (!headers.has("Content-Security-Policy")) {
    headers.set("Content-Security-Policy", "default-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  }
  if (!headers.has("Strict-Transport-Security")) {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  headers.set("Referrer-Policy", headers.get("Referrer-Policy") || "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", headers.get("X-Frame-Options") || "SAMEORIGIN");
  headers.delete("Content-Length");
  headers.delete("Content-Encoding");
  headers.delete("ETag");
  headers.delete("Last-Modified");
  headers.delete("Accept-Ranges");
  headers.delete("Content-Range");
  return headers;
}

function getEdgeCache(): EdgeCache | undefined {
  return (globalThis as typeof globalThis & { caches?: { default?: EdgeCache } }).caches?.default;
}

function articleCacheKey(request: Request, slug: string, shellVersion: string) {
  const url = new URL(request.url);
  url.pathname = `/news/${encodeURIComponent(slug)}`;
  url.search = `?__shell=${encodeURIComponent(shellVersion)}`;
  url.hash = "";
  return new Request(url, { method: "GET", headers: { Accept: "text/html" } });
}

async function shellVersion(template: string) {
  const assetReferences = Array.from(template.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/gi), (match) => match[1]);
  const source = assetReferences.length ? assetReferences.join("\n") : template;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return Array.from(new Uint8Array(digest).slice(0, 8), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function cacheHitResponse(cached: Response, headOnly: boolean) {
  const headers = htmlHeaders(cached.headers);
  headers.set("Cache-Control", `public, max-age=0, s-maxage=${cached.status === 404 ? 30 : 60}`);
  headers.set("X-Sarkari-Edge-Cache", "HIT");
  return new Response(headOnly ? null : cached.body, {
    status: cached.status,
    statusText: cached.statusText,
    headers,
  });
}

function warnCache(stage: "read" | "write", error: unknown) {
  console.warn(JSON.stringify({
    event: "sarkari_article_edge_cache_error",
    stage,
    message: error instanceof Error ? error.message.slice(0, 160) : "unknown cache error",
  }));
}

function warnEdge(stage: string, detail?: Record<string, string | number | boolean>) {
  console.warn(JSON.stringify({ event: "sarkari_article_edge_failure", stage, ...detail }));
}

function withoutBody(response: Response) {
  return new Response(null, { status: response.status, statusText: response.statusText, headers: response.headers });
}

class UpstreamPayloadTooLargeError extends Error {}

async function readBoundedJson(response: Response): Promise<unknown> {
  const declaredLength = Number(response.headers.get("Content-Length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_UPSTREAM_ARTICLE_BYTES) {
    await response.body?.cancel();
    throw new UpstreamPayloadTooLargeError();
  }
  if (!response.body) return null;

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_UPSTREAM_ARTICLE_BYTES) {
        await reader.cancel();
        throw new UpstreamPayloadTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function notFound(context: PagesContext, headOnly: boolean) {
  const url = new URL("/__sarkari_edge_article_not_found__", context.request.url);
  const fallback = "<!doctype html><title>Update not found | Sarkari DekhoCampus</title><h1>Update not found</h1>";
  let page: Response;
  let body = fallback;
  try {
    page = await context.env.ASSETS.fetch(new Request(url, { method: "GET", headers: { Accept: "text/html" } }));
    if (!page.ok && page.status !== 404) {
      warnEdge("not_found_asset_status", { status: page.status });
    }
    try {
      const rendered = await page.text();
      if (rendered.trim()) body = rendered;
    } catch (error) {
      warnEdge("not_found_asset_body", { kind: error instanceof Error ? error.name : "unknown" });
    }
  } catch (error) {
    warnEdge("not_found_asset_fetch", { kind: error instanceof Error ? error.name : "unknown" });
    page = new Response(fallback);
  }
  const headers = htmlHeaders(page.headers);
  headers.set("Cache-Control", "public, max-age=0, s-maxage=60, must-revalidate");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return new Response(headOnly ? null : body, { status: 404, headers });
}

function unavailable(headOnly: boolean) {
  const headers = htmlHeaders();
  headers.set("Cache-Control", "no-store");
  headers.set("Retry-After", "2");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return new Response(
    headOnly ? null : "<!doctype html><title>Temporarily unavailable | Sarkari DekhoCampus</title><h1>Temporarily unavailable</h1><p>Please try again shortly.</p>",
    { status: 503, headers },
  );
}

async function fetchArticle(context: PagesContext, slug: string) {
  const apiUrl = (context.env.API_URL || context.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, "");
  const query = new URLSearchParams({
    select: PUBLIC_ARTICLE_DETAIL_FIELDS,
    site_scope: "eq.sarkari",
    slug: `eq.${slug}`,
    status: "eq.Published",
    is_active: "eq.true",
    limit: "1",
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    return await fetch(`${apiUrl}/v1/rest/articles?${query}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function onRequest(context: PagesContext) {
  const method = context.request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  const headOnly = method === "HEAD";
  const rawSlug = Array.isArray(context.params.slug) ? context.params.slug[0] : context.params.slug;
  const slug = normalizeArticleSlug(rawSlug);
  if (!slug) return notFound(context, headOnly);
  const canonicalPath = `/news/${encodeURIComponent(slug)}`;
  if (rawSlug !== slug || new URL(context.request.url).pathname !== canonicalPath) {
    return Response.redirect(`${SITE_URL}/news/${encodeURIComponent(slug)}`, 301);
  }

  let asset: Response;
  const assetUrl = new URL("/", context.request.url);
  const assetRequest = new Request(assetUrl, { method: "GET", headers: { Accept: "text/html" } });
  try { asset = await context.env.ASSETS.fetch(assetRequest); } catch {
    warnEdge("shell_fetch");
    return unavailable(headOnly);
  }
  if (!asset.ok) {
    warnEdge("shell_status", { status: asset.status });
    return unavailable(headOnly);
  }
  let template: string;
  try {
    template = await asset.text();
  } catch (error) {
    warnEdge("shell_body", { kind: error instanceof Error ? error.name : "unknown" });
    return unavailable(headOnly);
  }
  const hasModuleScript = /<script\b(?=[^>]*\btype\s*=\s*["']module["'])[^>]*>/i.test(template);
  if (!/<\/head>/i.test(template) || !/<\/body>/i.test(template) || !hasModuleScript) {
    warnEdge("shell_contract");
    return unavailable(headOnly);
  }

  const cache = getEdgeCache();
  const cacheKey = articleCacheKey(context.request, slug, await shellVersion(template));
  let cacheBypassed = !cache;
  if (cache) {
    try {
      const cached = await cache.match(cacheKey);
      if (cached) return cacheHitResponse(cached, headOnly);
    } catch (error) {
      cacheBypassed = true;
      warnCache("read", error);
    }
  }

  let upstream: Response;
  try {
    upstream = await fetchArticle(context, slug);
  } catch (error) {
    warnEdge("api_fetch", { kind: error instanceof Error ? error.name : "unknown" });
    return unavailable(headOnly);
  }
  if (!upstream.ok) {
    warnEdge("api_status", { status: upstream.status });
    return unavailable(headOnly);
  }

  let rows: unknown;
  try { rows = await readBoundedJson(upstream); } catch (error) {
    warnEdge(error instanceof UpstreamPayloadTooLargeError ? "api_payload_too_large" : "api_json");
    return unavailable(headOnly);
  }
  if (!Array.isArray(rows)) {
    warnEdge("api_contract", { reason: "non_array" });
    return unavailable(headOnly);
  }
  if (rows.length === 0) {
    const missing = await notFound(context, false);
    missing.headers.set("Cache-Control", "public, max-age=0, s-maxage=30");
    missing.headers.set("X-Sarkari-Edge-Cache", cacheBypassed ? "BYPASS" : "MISS");
    if (cache) {
      const cachedHeaders = new Headers(missing.headers);
      cachedHeaders.set("Cache-Control", "public, max-age=30");
      cachedHeaders.set("X-Sarkari-Edge-Cache", "HIT");
      const cachedMissing = new Response(missing.clone().body, { status: 404, headers: cachedHeaders });
      context.waitUntil(cache.put(cacheKey, cachedMissing).catch((error) => warnCache("write", error)));
    }
    return headOnly ? withoutBody(missing) : missing;
  }
  if (rows.length !== 1) {
    warnEdge("api_contract", { reason: "multiple_rows" });
    return unavailable(headOnly);
  }
  const rawCandidate = rows[0];
  if (!rawCandidate || typeof rawCandidate !== "object" || Array.isArray(rawCandidate)) {
    warnEdge("api_contract", { reason: "article_shape" });
    return unavailable(headOnly);
  }
  const candidate = rawCandidate as Record<string, unknown>;
  const active = candidate.is_active === true || candidate.is_active === 1;
  if (candidate.slug !== slug) {
    warnEdge("api_contract", { reason: "slug" });
    return unavailable(headOnly);
  }
  if (typeof candidate.title !== "string" || !plainText(candidate.title)) {
    warnEdge("api_contract", { reason: "title" });
    return unavailable(headOnly);
  }
  if (candidate.site_scope !== "sarkari") {
    warnEdge("api_contract", { reason: "site_scope" });
    return unavailable(headOnly);
  }
  if (!isPublishedArticleStatus(candidate.status) || !active) {
    warnEdge("api_contract", { reason: "publication_state" });
    return unavailable(headOnly);
  }
  const article = validatePublicSarkariArticle(candidate, slug);
  if (!article) {
    warnEdge("api_contract", { reason: "article_shape" });
    return unavailable(headOnly);
  }

  const body = renderArticleHtml(template, article);
  const headers = htmlHeaders(asset.headers);
  headers.set("Cache-Control", "public, max-age=0, s-maxage=60");
  headers.set("X-Sarkari-Edge-Cache", cacheBypassed ? "BYPASS" : "MISS");
  headers.set("X-Content-Type-Options", "nosniff");
  const response = new Response(body, { status: 200, headers });
  if (cache) {
    const cachedHeaders = new Headers(headers);
    cachedHeaders.set("Cache-Control", "public, max-age=60");
    cachedHeaders.set("X-Sarkari-Edge-Cache", "HIT");
    const cachedResponse = new Response(body, { status: 200, headers: cachedHeaders });
    context.waitUntil(cache.put(cacheKey, cachedResponse).catch((error) => warnCache("write", error)));
  }
  return headOnly ? withoutBody(response) : response;
}
