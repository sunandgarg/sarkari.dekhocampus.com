import { describe, expect, it } from "vitest";
import { applyScriptNonce, onRequest } from "../../functions/_middleware";

describe("Sarkari Pages CSP middleware", () => {
  it("gives every executable and structured-data script the current response nonce", async () => {
    const response = await onRequest({
      request: new Request("https://sarkari.dekhocampus.com/"),
      next: async () => new Response('<!doctype html><html><head><meta property="csp-nonce" nonce="stale"><link rel="modulepreload" href="/assets/vendor.js"></head><body><script src="/assets/app.js"></script><script nonce="stale" type="application/ld+json">{}</script></body></html>', {
        headers: { "Content-Type": "text/html; charset=utf-8", ETag: '"old"' },
      }),
    });
    const csp = response.headers.get("content-security-policy") || "";
    const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
    expect(nonce).toMatch(/^[a-f0-9]{32}$/);
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toContain("script-src-attr 'none'");
    const html = await response.text();
    expect(html.match(new RegExp(`nonce="${nonce}"`, "g"))).toHaveLength(4);
    expect(html).toContain(`<meta property="csp-nonce" nonce="${nonce}">`);
    expect(html).toContain(`<link rel="modulepreload" href="/assets/vendor.js" nonce="${nonce}">`);
    expect(html).not.toContain('nonce="stale"');
    expect(response.headers.has("etag")).toBe(false);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("preserves status and security headers while returning no HEAD body", async () => {
    let forwarded: Request | undefined;
    const response = await onRequest({
      request: new Request("https://sarkari.dekhocampus.com/news/job", { method: "HEAD", headers: { "If-None-Match": '"old"', Range: "bytes=0-10" } }),
      next: async (request) => {
        forwarded = request;
        return new Response("not found", { status: 404, headers: { "Content-Type": "text/html" } });
      },
    });
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
    expect(response.headers.get("strict-transport-security")).toContain("max-age=31536000");
    expect(response.headers.get("content-security-policy")).toContain("strict-dynamic");
    expect(forwarded?.method).toBe("GET");
    expect(forwarded?.headers.has("if-none-match")).toBe(false);
    expect(forwarded?.headers.has("range")).toBe(false);
  });

  it("does not transform non-HTML assets", async () => {
    const original = new Response("body{}", { headers: { "Content-Type": "text/css", ETag: '"asset"' } });
    const response = await onRequest({
      request: new Request("https://sarkari.dekhocampus.com/assets/app.css"),
      next: async () => original,
    });
    expect(response).toBe(original);
    expect(response.headers.get("etag")).toBe('"asset"');
  });

  it("replaces a prior nonce rather than accumulating stale authorization", () => {
    expect(applyScriptNonce('<script nonce="old">1</script>', "new")).toContain('<script nonce="new">');
  });

  it("does not pair a fresh nonce with a body cached under an older nonce", async () => {
    const response = await onRequest({
      request: new Request("https://sarkari.dekhocampus.com/", { headers: { "If-None-Match": '"old"' } }),
      next: async () => new Response(null, { status: 304, headers: { "Content-Type": "text/html" } }),
    });
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
