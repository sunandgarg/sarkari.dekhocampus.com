type PagesMiddlewareContext = {
  request: Request;
  next(input?: Request): Promise<Response>;
};

function createNonce() {
  return crypto.randomUUID().replace(/-/g, "");
}

function contentSecurityPolicy(nonce: string) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' 'unsafe-eval' https: http:`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https: wss:",
    "frame-src 'self' https:",
    "media-src 'self' blob: https:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function applyScriptNonce(html: string, nonce: string) {
  const withNonce = (tag: string) => tag
    .replace(/\snonce\s*=\s*(?:["'][^"']*["']|[^\s>]+)/gi, "")
    .replace(/\/?>$/, (ending) => ` nonce="${nonce}"${ending}`);
  const withoutStaleMeta = html.replace(
    /<meta\b(?=[^>]*\bproperty\s*=\s*["']csp-nonce["'])[^>]*>\s*/gi,
    "",
  );
  const nonced = withoutStaleMeta
    .replace(/<script\b[^>]*>/gi, withNonce)
    .replace(/<link\b(?=[^>]*\brel\s*=\s*["']modulepreload["'])[^>]*>/gi, withNonce);
  return nonced.replace(
    /<head\b[^>]*>/i,
    (head) => `${head}<meta property="csp-nonce" nonce="${nonce}">`,
  );
}

export async function onRequest(context: PagesMiddlewareContext) {
  const incomingMethod = context.request.method.toUpperCase();
  let downstreamRequest: Request | undefined;
  if (incomingMethod === "GET" || incomingMethod === "HEAD") {
    const headers = new Headers(context.request.headers);
    for (const name of ["If-Match", "If-None-Match", "If-Modified-Since", "If-Unmodified-Since", "If-Range", "Range"]) {
      headers.delete(name);
    }
    downstreamRequest = new Request(context.request, { method: "GET", headers });
  }
  const response = await context.next(downstreamRequest);
  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("text/html")) return response;

  if (response.status === 304) {
    return new Response(null, {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "1", "X-Robots-Tag": "noindex" },
    });
  }

  const nonce = createNonce();
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", contentSecurityPolicy(nonce));
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  // The article Function maintains its own unnonced object cache. Once a
  // response-specific nonce is injected, the final HTML must never enter a
  // shared or browser cache where its nonce could be replayed.
  headers.set("Cache-Control", "private, no-store");
  headers.delete("Content-Length");
  headers.delete("Content-Encoding");
  headers.delete("ETag");
  headers.delete("Last-Modified");
  headers.delete("Content-Security-Policy-Report-Only");

  if (incomingMethod === "HEAD") {
    return new Response(null, { status: response.status, statusText: response.statusText, headers });
  }

  const html = applyScriptNonce(await response.text(), nonce);
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}
