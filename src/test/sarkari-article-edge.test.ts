import { describe, expect, it, vi } from "vitest";
import { normalizeArticleSlug, onRequest, renderArticleHtml } from "../../functions/news/[slug]";
import {
  PUBLIC_ARTICLE_DETAIL_FIELDS,
  SARKARI_ARTICLE_BOOTSTRAP_ID,
  parseSarkariArticleBootstrap,
  type PublicSarkariArticle,
} from "@/lib/sarkariArticleBootstrap";

const template = `<!doctype html><html><head>
  <title>Home</title>
  <meta name="description" content="home description">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://sarkari.dekhocampus.com/">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Home">
  <meta property="og:image" content="https://sarkari.dekhocampus.com/icon-512.png">
  <meta name="twitter:card" content="summary">
</head><body><div id="root"></div><noscript><main><h1>Generic home</h1></main></noscript><script type="module" src="/assets/app.js"></script></body></html>`;

const article: PublicSarkariArticle = {
  id: "article-railway-clerk-2026",
  slug: "railway-clerk-2026",
  title: `Railway Clerk <2026>`,
  site_scope: "sarkari",
  status: "Published",
  is_active: true,
  description: "<p>Dates &amp; eligibility details.</p>",
  content: `<h2>Important dates</h2><p>Apply safely.</p><script>window.evil = true</script>`,
  vertical: "Government Jobs",
  category: "Latest Jobs",
  author: "Sarkari Desk",
  featured_image: "https://cdn.example.com/railway.webp",
  views: 42,
  tags: ["Railway", "Clerk"],
  featured_rank: 1,
  meta_title: "Railway Clerk",
  meta_description: "Railway clerk dates and eligibility.",
  meta_keywords: "railway, clerk",
  created_at: "2026-09-12T00:00:00.000Z",
  updated_at: "2026-09-12T01:00:00.000Z",
};

const assets = (response = new Response(template, { status: 200, headers: { "Content-Type": "text/html" } })) => ({
  fetch: vi.fn().mockResolvedValue(response),
});

describe("Sarkari article Pages Function", () => {
  it("normalizes only canonical public article slugs", () => {
    expect(normalizeArticleSlug("Railway%20Clerk%202026")).toBe("railway-clerk-2026");
    expect(normalizeArticleSlug("%E0%A4%A")).toBe("");
  });

  it("replaces homepage metadata with escaped article metadata and crawlable fallback", () => {
    const html = renderArticleHtml(template, article);
    expect(html).toContain("<title>Railway Clerk | Sarkari DekhoCampus</title>");
    expect(html).toContain('rel="canonical" href="https://sarkari.dekhocampus.com/news/railway-clerk-2026"');
    expect(html).toContain('property="og:type" content="article"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('id="ld-json-page"');
    expect(html).toContain(`id="${SARKARI_ARTICLE_BOOTSTRAP_ID}" type="application/json"`);
    expect(html).toContain("Important dates Apply safely.");
    expect(html).not.toContain("window.evil = true</p>");
    expect(html).toContain("Railway Clerk &lt;2026&gt;</h1>");
    expect(html.match(/name="description"/g)).toHaveLength(1);
    expect(html).not.toContain('<meta property="og:title" content="Home">');

    const schemaText = html.match(/<script id="ld-json-page"[^>]*>([\s\S]*?)<\/script>/)?.[1] || "{}";
    const schema = JSON.parse(schemaText);
    expect(schema.articleBody).toBe("Important dates Apply safely.");

    const bootstrapText = html.match(new RegExp(`<script id="${SARKARI_ARTICLE_BOOTSTRAP_ID}"[^>]*>([\\s\\S]*?)<\\/script>`))?.[1] || "";
    expect(bootstrapText).toContain("\\u003cscript>");
    expect(bootstrapText).not.toContain("<script>");
    expect(parseSarkariArticleBootstrap(bootstrapText, article.slug, `/news/${article.slug}`)?.content).toContain("window.evil");
    expect(html.indexOf('src="/assets/app.js"')).toBeLessThan(html.indexOf(`id="${SARKARI_ARTICLE_BOOTSTRAP_ID}"`));
  });

  it("bounds the sanitized article text exposed to agents and non-JavaScript readers", () => {
    const html = renderArticleHtml(template, { ...article, content: `<p>${"A".repeat(15_000)}</p>` });
    const schemaText = html.match(/<script id="ld-json-page"[^>]*>([\s\S]*?)<\/script>/)?.[1] || "{}";
    expect(JSON.parse(schemaText).articleBody).toHaveLength(12_000);
  });

  it("queries only published, active Sarkari content and returns a real 404 for an unknown slug", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("[]", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    const assetBinding = {
      fetch: vi.fn().mockImplementation((request: Request) => new URL(request.url).pathname === "/"
        ? Promise.resolve(new Response(template, { status: 200, headers: { "Content-Type": "text/html" } }))
        : Promise.resolve(new Response("<h1>Not found</h1>", { status: 404, headers: { "Content-Type": "text/html" } }))),
    };
    const response = await onRequest({
      request: new Request("https://sarkari.dekhocampus.com/news/missing"),
      env: { API_URL: "https://api.example.com", ASSETS: assetBinding },
      params: { slug: "missing" },
      waitUntil: vi.fn(),
    });
    expect(response.status).toBe(404);
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    const requested = new URL(String(fetchSpy.mock.calls[0][0]));
    expect(requested.searchParams.get("site_scope")).toBe("eq.sarkari");
    expect(requested.searchParams.get("status")).toBe("eq.Published");
    expect(requested.searchParams.get("is_active")).toBe("eq.true");
    expect(requested.searchParams.get("select")).toBe(PUBLIC_ARTICLE_DETAIL_FIELDS);
    fetchSpy.mockRestore();
  });

  it("accepts legacy lowercase published rows and normalizes the browser bootstrap status", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify([{ ...article, status: " published " }]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    const response = await onRequest({
      request: new Request("https://sarkari.dekhocampus.com/news/railway-clerk-2026"),
      env: { API_URL: "https://api.example.com", ASSETS: assets() },
      params: { slug: "railway-clerk-2026" },
      waitUntil: vi.fn(),
    });
    const html = await response.text();
    const bootstrapText = html.match(new RegExp(`<script id="${SARKARI_ARTICLE_BOOTSTRAP_ID}"[^>]*>([\\s\\S]*?)<\\/script>`))?.[1] || "";
    expect(response.status).toBe(200);
    expect(parseSarkariArticleBootstrap(bootstrapText, article.slug, `/news/${article.slug}`)?.status).toBe("Published");
    fetchSpy.mockRestore();
  });

  it("fails with a retryable 503 instead of misclassifying an API outage as not found", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("database unavailable"));
    const response = await onRequest({
      request: new Request("https://sarkari.dekhocampus.com/news/railway-clerk-2026"),
      env: { API_URL: "https://api.example.com", ASSETS: assets() },
      params: { slug: "railway-clerk-2026" },
      waitUntil: vi.fn(),
    });
    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("2");
    fetchSpy.mockRestore();
  });

  it("rejects an oversized upstream article response before buffering it", async () => {
    const warnings = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("[]", {
      status: 200,
      headers: { "Content-Type": "application/json", "Content-Length": "2000001" },
    }));
    const response = await onRequest({
      request: new Request("https://sarkari.dekhocampus.com/news/railway-clerk-2026"),
      env: { API_URL: "https://api.example.com", ASSETS: assets() },
      params: { slug: "railway-clerk-2026" },
      waitUntil: vi.fn(),
    });
    expect(response.status).toBe(503);
    expect(warnings.mock.calls.flat().join(" ")).toContain("api_payload_too_large");
    warnings.mockRestore();
    fetchSpy.mockRestore();
  });

  it("reports an unreadable application shell instead of failing silently", async () => {
    const warnings = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const brokenShell = new Response(new ReadableStream({
      start(controller) { controller.error(new Error("asset stream unavailable")); },
    }), { status: 200, headers: { "Content-Type": "text/html" } });
    const response = await onRequest({
      request: new Request("https://sarkari.dekhocampus.com/news/railway-clerk-2026"),
      env: { API_URL: "https://api.example.com", ASSETS: assets(brokenShell) },
      params: { slug: "railway-clerk-2026" },
      waitUntil: vi.fn(),
    });
    expect(response.status).toBe(503);
    expect(warnings.mock.calls.flat().join(" ")).toContain("shell_body");
    warnings.mockRestore();
  });

  it("rejects a truncated shell that cannot place bootstrap after module discovery", async () => {
    const warnings = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const response = await onRequest({
      request: new Request("https://sarkari.dekhocampus.com/news/railway-clerk-2026"),
      env: { API_URL: "https://api.example.com", ASSETS: assets(new Response("<!doctype html><head></head><body>truncated", { status: 200, headers: { "Content-Type": "text/html" } })) },
      params: { slug: "railway-clerk-2026" },
      waitUntil: vi.fn(),
    });
    expect(response.status).toBe(503);
    expect(warnings.mock.calls.flat().join(" ")).toContain("shell_contract");
    warnings.mockRestore();
  });

  it.each([
    { payload: {}, label: "non-array JSON" },
    { payload: [{ ...article, slug: "a-different-job" }], label: "a mismatched slug" },
    { payload: [{ ...article, site_scope: "dekhocampus" }], label: "a mismatched tenant" },
    { payload: [{ ...article, status: "Draft" }], label: "a draft row" },
  ])("returns 503 for $label instead of asserting that the article is absent", async ({ payload }) => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    const response = await onRequest({
      request: new Request("https://sarkari.dekhocampus.com/news/railway-clerk-2026"),
      env: { API_URL: "https://api.example.com", ASSETS: assets() },
      params: { slug: "railway-clerk-2026" },
      waitUntil: vi.fn(),
    });
    expect(response.status).toBe(503);
    fetchSpy.mockRestore();
  });

  it("uses a GET asset internally while preserving a bodyless successful HEAD response", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify([article]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    const assetBinding = assets();
    const response = await onRequest({
      request: new Request("https://sarkari.dekhocampus.com/news/railway-clerk-2026?utm_source=test", { method: "HEAD", headers: { "If-Modified-Since": "Fri, 12 Sep 2025 00:00:00 GMT", Range: "bytes=0-100" } }),
      env: { API_URL: "https://api.example.com", ASSETS: assetBinding },
      params: { slug: "railway-clerk-2026" },
      waitUntil: vi.fn(),
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
    const assetRequest = assetBinding.fetch.mock.calls[0][0] as Request;
    expect(assetRequest.method).toBe("GET");
    expect(new URL(assetRequest.url).pathname).toBe("/");
    expect(assetRequest.headers.has("if-modified-since")).toBe(false);
    expect(assetRequest.headers.has("range")).toBe(false);
    fetchSpy.mockRestore();
  });

  it("uses the normalized Cloudflare cache key and serves a hit without querying AWS", async () => {
    const cached = new Response("cached article", { status: 200, headers: { "X-Sarkari-Edge-Cache": "HIT" } });
    const cache = { match: vi.fn().mockResolvedValue(cached), put: vi.fn() };
    const previousCaches = (globalThis as typeof globalThis & { caches?: unknown }).caches;
    Object.defineProperty(globalThis, "caches", { configurable: true, value: { default: cache } });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await onRequest({
      request: new Request("https://sarkari.dekhocampus.com/news/railway-clerk-2026?utm_source=ignored"),
      env: { API_URL: "https://api.example.com", ASSETS: assets() },
      params: { slug: "railway-clerk-2026" },
      waitUntil: vi.fn(),
    });
    expect(await response.text()).toBe("cached article");
    expect(fetchSpy).not.toHaveBeenCalled();
    const key = cache.match.mock.calls[0][0] as Request;
    const keyUrl = new URL(key.url);
    expect(keyUrl.pathname).toBe("/news/railway-clerk-2026");
    expect(keyUrl.searchParams.get("__shell")).toMatch(/^[a-f0-9]{16}$/);
    fetchSpy.mockRestore();
    Object.defineProperty(globalThis, "caches", { configurable: true, value: previousCaches });
  });

  it("stores a versioned short-lived response and reports cache failures without hiding the article", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify([article]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    const writeError = new Error("cache write unavailable");
    const cache = { match: vi.fn().mockRejectedValue(new Error("cache read unavailable")), put: vi.fn().mockRejectedValue(writeError) };
    const previousCaches = (globalThis as typeof globalThis & { caches?: unknown }).caches;
    Object.defineProperty(globalThis, "caches", { configurable: true, value: { default: cache } });
    const warnings = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const pending: Promise<unknown>[] = [];
    const response = await onRequest({
      request: new Request("https://sarkari.dekhocampus.com/news/railway-clerk-2026"),
      env: { API_URL: "https://api.example.com", ASSETS: assets() },
      params: { slug: "railway-clerk-2026" },
      waitUntil: (promise) => pending.push(promise),
    });
    await Promise.all(pending);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-sarkari-edge-cache")).toBe("BYPASS");
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");
    expect(cache.put).toHaveBeenCalledOnce();
    expect(warnings).toHaveBeenCalledTimes(2);
    expect(warnings.mock.calls.flat().join(" ")).not.toContain("https://api.example.com");
    warnings.mockRestore();
    fetchSpy.mockRestore();
    Object.defineProperty(globalThis, "caches", { configurable: true, value: previousCaches });
  });

  it("briefly negative-caches a confirmed empty result without caching an outage", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("[]", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    let stored: Response | undefined;
    const cache = {
      match: vi.fn().mockImplementation(async () => stored?.clone()),
      put: vi.fn().mockImplementation(async (_key: Request, response: Response) => { stored = response.clone(); }),
    };
    const previousCaches = (globalThis as typeof globalThis & { caches?: unknown }).caches;
    Object.defineProperty(globalThis, "caches", { configurable: true, value: { default: cache } });
    const pending: Promise<unknown>[] = [];
    const assetBinding = {
      fetch: vi.fn().mockImplementation((request: Request) => new URL(request.url).pathname === "/"
        ? Promise.resolve(new Response(template, { status: 200, headers: { "Content-Type": "text/html" } }))
        : Promise.resolve(new Response("<h1>Not found</h1>", { status: 404, headers: { "Content-Type": "text/html" } }))),
    };
    const context = {
      request: new Request("https://sarkari.dekhocampus.com/news/missing"),
      env: { API_URL: "https://api.example.com", ASSETS: assetBinding },
      params: { slug: "missing" },
      waitUntil: (promise: Promise<unknown>) => pending.push(promise),
    };

    const miss = await onRequest(context);
    await Promise.all(pending);
    const hit = await onRequest({ ...context, waitUntil: vi.fn() });
    expect(miss.status).toBe(404);
    expect(miss.headers.get("x-sarkari-edge-cache")).toBe("MISS");
    expect(hit.status).toBe(404);
    expect(hit.headers.get("x-sarkari-edge-cache")).toBe("HIT");
    expect(fetchSpy).toHaveBeenCalledOnce();
    fetchSpy.mockRestore();
    Object.defineProperty(globalThis, "caches", { configurable: true, value: previousCaches });
  });
});
