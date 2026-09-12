import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(path), "utf8");

describe("Sarkari Pages edge contract", () => {
  it("inherits the exact DekhoCampus brand typography and color tokens", () => {
    const css = read("src/index.css");
    expect(css).toContain("--primary: 224 64% 51%");
    expect(css).toContain("--accent: 25 90% 55%");
    expect(css).toContain("--background: 220 14% 99%");
    expect(css).toContain("--foreground: 220 25% 10%");
    expect(css).toContain("--sarkari-primary: hsl(var(--primary))");
    expect(css).toContain("--sarkari-accent: hsl(var(--accent))");
    expect(css).toContain("--sarkari-success-ink: color-mix(in srgb, hsl(var(--success)) 45%, hsl(var(--foreground)))");
    expect(css).toContain('font-family: Inter, ui-sans-serif, system-ui');
    expect(css).toContain(".sarkari-archive-pagination > a { min-height: 42px;");
    expect(css).toContain("border: 1px solid var(--sarkari-primary-border)");
    expect(css).toContain("color: var(--sarkari-primary)");
    expect(css).not.toContain("color: #3257d2");
  });

  it("keeps only real SPA routes on the HTML fallback", () => {
    const redirects = read("public/_redirects");
    expect(redirects).toContain("/news / 301");
    expect(redirects).toContain("/news/:slug /index.html 200");
    expect(redirects).toContain("/news/tag/:tag /index.html 200");
    expect(redirects).not.toContain("/news/* /index.html 200");
    expect(redirects).not.toMatch(/^\/\* \/index\.html 200$/m);

    const notFound = read("public/404.html");
    expect(notFound).toContain('name="robots" content="noindex, nofollow, noarchive"');

    const routes = JSON.parse(read("public/_routes.json"));
    expect(routes.include).toEqual(["/news/*"]);
    expect(routes.exclude).toEqual(["/news/tag/*"]);
    const articleFunction = read("functions/news/[slug].ts");
    expect(articleFunction).toContain('site_scope: "eq.sarkari"');
    expect(articleFunction).toContain('status: "eq.Published"');
    expect(articleFunction).toContain("status: 404");
    const middleware = read("functions/_middleware.ts");
    expect(middleware).toContain("'strict-dynamic'");
    expect(middleware).toContain("applyScriptNonce");
  });

  it("ships security headers without blocking configured analytics origins", () => {
    const headers = read("public/_headers");
    for (const required of [
      "Strict-Transport-Security:",
      "Content-Security-Policy:",
      "Cross-Origin-Opener-Policy: same-origin-allow-popups",
      "https://aws-origin.dekhocampus.com",
      "https://*.googletagmanager.com",
      "https://*.googlesyndication.com",
      "https://*.clarity.ms",
      "https://bat.bing.com",
      "https://*.hotjar.io",
      "https://static.cloudflareinsights.com",
      "https://cloudflareinsights.com",
    ]) expect(headers).toContain(required);

    expect(headers).not.toMatch(/\/assets\/\*[\s\S]{0,120}Cache-Control:[^\n]*immutable/);
  });

  it("publishes install and agent-discovery metadata as real files", () => {
    const manifest = JSON.parse(read("public/site.webmanifest"));
    expect(manifest.start_url).toBe("/");
    expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(["192x192", "512x512"]);
    expect(read("public/llms-full.txt")).toContain("## Reliability and answer guidance");
    expect(read("public/.well-known/security.txt")).toContain("Canonical: https://sarkari.dekhocampus.com/.well-known/security.txt");
    const sourceRobots = read("public/robots.txt");
    const metadataGenerator = read("scripts/apply-site-metadata.ts");
    for (const answerAgent of ["OAI-SearchBot", "ChatGPT-User", "Claude-User", "Claude-SearchBot"]) {
      expect(sourceRobots).toContain(`User-agent: ${answerAgent}`);
      expect(metadataGenerator).toContain(`User-agent: ${answerAgent}`);
    }
    expect(sourceRobots).not.toContain("User-agent: GPTBot");
    expect(sourceRobots).not.toContain("User-agent: ClaudeBot");
    expect(metadataGenerator).not.toContain("User-agent: GPTBot");
    expect(metadataGenerator).not.toContain("User-agent: ClaudeBot");

    const index = read("index.html");
    expect(index).toContain('rel="manifest" href="/site.webmanifest"');
    expect(index).toContain('sizes="180x180" href="/apple-touch-icon.png"');
    expect(index).toContain('name="twitter:card" content="summary"');
    expect(index).toContain('content="https://sarkari.dekhocampus.com/icon-512.png"');
    expect(index).toContain('<h1 class="dc-shell-title">Your shortcut to <strong>government opportunities</strong></h1>');
    expect(index).toContain('id="dc-first-paint-shell" hidden aria-hidden="true"');

    const app = read("src/App.tsx");
    expect(app).toContain('<OptionalIntegrationBoundary name="site-integrations">');
    expect(app).toContain("<SiteIntegrations />");
    expect(app).toContain("<AdsenseLoader />");
    expect(app).toContain("<CookieConsent />");
    expect(index).not.toContain("googletagmanager.com/ns.html");

    const integrations = read("src/components/SiteIntegrations.tsx");
    const ads = read("src/components/ads/AdsenseLoader.tsx");
    expect(integrations).toContain("useCookiePreferences");
    expect(integrations).toContain("preferences.analytics");
    expect(integrations).toContain("preferences.marketing");
    expect(ads).toContain("!preferences.marketing");

    const notFoundPage = read("src/pages/SarkariNotFound.tsx");
    expect(notFoundPage).toContain("ogImage={SITE_CONFIG.ogImagePath}");
    expect(notFoundPage).toContain('twitterCard="summary"');
  });
});
