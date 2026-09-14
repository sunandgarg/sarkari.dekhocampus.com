import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SARKARI_LEGAL_PAGES, sarkariLegalShellPath } from "@/lib/sarkariLegal";

const read = (path: string) => readFileSync(resolve(path), "utf8");

describe("Sarkari legal edge and prerender contract", () => {
  it("rewrites only known canonical routes to route-specific crawlable documents", () => {
    const redirects = read("public/_redirects");
    for (const page of SARKARI_LEGAL_PAGES) {
      expect(redirects).toContain(`${page.path}/ ${page.path} 301`);
      expect(redirects).toContain(`${page.path} ${sarkariLegalShellPath(page.slug)} 200`);
    }
    expect(redirects).not.toMatch(/^\/legal\/(?:\*|:slug)\s+/m);
    expect(redirects).not.toMatch(/^\/legal\/[\w-]+ \/index\.html 200$/m);
    expect(redirects).not.toMatch(/^\/legal\/[\w-]+ \/__sarkari_article_shell\.asset 200$/m);
  });

  it("keeps canonical legal URLs indexable while internal targets are noindex", () => {
    const headers = read("public/_headers");
    const publicBlock = headers.match(/^\/legal\/\*\n((?:  [^\n]*\n?)+)/m)?.[1] || "";
    const internalBlock = headers.match(/^\/__sarkari_legal_\*\n((?:  [^\n]*\n?)+)/m)?.[1] || "";
    expect(publicBlock).toContain("Content-Type: text/html; charset=utf-8");
    expect(publicBlock).not.toContain("X-Robots-Tag");
    expect(internalBlock).toContain("X-Robots-Tag: noindex, nofollow, noarchive");
  });

  it("generates legal documents after the homepage shell is complete", () => {
    const packageJson = read("package.json");
    const postbuild = JSON.parse(packageJson).scripts.postbuild as string;
    expect(postbuild).toContain("tsx scripts/prerender-legal.ts");
    expect(postbuild.indexOf("scripts/prerender-legal.ts")).toBeGreaterThan(postbuild.indexOf("check:home-prerender"));

    const generator = read("scripts/prerender-legal.ts");
    expect(generator).toContain("stripHomePrerenderFromHtml");
    expect(generator).toContain("restoreBlockingStylesheetFromHomeCriticalCss");
    expect(generator).toContain("legalPrerenderValue(page.path)");
    expect(generator).toContain("Route-matched hydration marker missing");
    expect(generator).toContain('content="index, follow, max-image-preview:large');
    expect(generator).toContain('id="ld-json-page"');
    expect(generator).not.toContain('id="ld-json-legal"');
    expect(generator).toContain("Expected one main element");
    const serverEntry = read("src/entry-server.tsx");
    expect(serverEntry).toContain("renderLegalPrerender");
    expect(serverEntry).toContain("LEGAL_PRERENDER_IDENTIFIER_PREFIX");
  });

  it("preserves prerendered legal DOM only when its public route marker matches", () => {
    const index = read("index.html");
    for (const page of SARKARI_LEGAL_PAGES) expect(index).toContain(`"${page.path}"`);
    expect(index).toContain('prerenderMarker === `legal:${normalizedPath}`');
    expect(index).toContain("if (!hasHomePrerender && !hasLegalPrerender)");

    const main = read("src/main.tsx");
    expect(main).toContain("hasHydratableLegalPrerender(root, window.location)");
    expect(main).toContain("LEGAL_PRERENDER_IDENTIFIER_PREFIX");
  });
});
