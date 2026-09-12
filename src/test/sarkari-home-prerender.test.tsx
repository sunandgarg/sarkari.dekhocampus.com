import { describe, expect, it, vi } from "vitest";
import { act } from "@testing-library/react";
import { hydrateRoot, type Root } from "react-dom/client";
import App from "@/App";
import { renderHomePrerender } from "@/entry-server";
import {
  HOME_CRITICAL_CSS_END,
  HOME_CRITICAL_CSS_START,
  HOME_PRERENDER_END,
  HOME_PRERENDER_IDENTIFIER_PREFIX,
  HOME_PRERENDER_START,
  hasHydratableHomePrerender,
  isExactHomeLocation,
  restoreBlockingStylesheetFromHomeCriticalCss,
  stripHomePrerenderFromHtml,
} from "@/lib/homePrerender";

describe("Sarkari exact-home prerender", () => {
  it("renders the real deterministic homepage while optional integrations stay absent", () => {
    vi.stubGlobal("__APP_BUILD_YEAR__", 2026);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const markup = renderHomePrerender();
    const unexpectedErrors = consoleError.mock.calls.map(([message]) => String(message));
    consoleError.mockRestore();
    vi.unstubAllGlobals();
    expect(unexpectedErrors).toEqual([]);
    expect(markup).toMatch(/^(?:<!--\$-->)?<div class="sarkari-site">/);
    expect(markup).toContain('class="sarkari-header"');
    expect(markup).toContain('class="sarkari-hero"');
    expect(markup).toContain("<h1>Your shortcut to <em>government opportunities</em></h1>");
    expect(markup).toContain('class="sarkari-search"');
    expect(markup).toContain("Loading latest updates...");
    expect(markup).toContain('class="sarkari-footer"');
    expect(markup).not.toContain('data-testid="cookie-consent-bar"');
    expect(markup).not.toContain("adsbygoogle");
    expect(markup).not.toContain("adsense-custom");
  });

  it("hydrates only the exact unfiltered root with the expected server tree", () => {
    expect(isExactHomeLocation({ pathname: "/", search: "" })).toBe(true);
    expect(isExactHomeLocation({ pathname: "/", search: "?q=railway" })).toBe(false);
    expect(isExactHomeLocation({ pathname: "/news/tag/jobs", search: "" })).toBe(false);

    const root = document.createElement("div");
    root.setAttribute("data-sarkari-prerender", "home");
    root.innerHTML = '<div class="sarkari-site"></div>';
    expect(hasHydratableHomePrerender(root, { pathname: "/", search: "" })).toBe(true);
    expect(hasHydratableHomePrerender(root, { pathname: "/", search: "?category=Results" })).toBe(false);
    root.append(document.createElement("aside"));
    expect(hasHydratableHomePrerender(root, { pathname: "/", search: "" })).toBe(false);
  });

  it("hydrates the real app without recovery and preserves server DOM identity", async () => {
    vi.stubGlobal("__APP_BUILD_YEAR__", 2026);
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("requestIdleCallback", vi.fn(() => 1));
    vi.stubGlobal("cancelIdleCallback", vi.fn());
    // Keep React Query reads pending so this test isolates the hydration pass
    // and never waits on or races a post-hydration data update.
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => undefined)));
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    window.history.replaceState({}, "", "/");

    const container = document.createElement("div");
    container.id = "root";
    container.innerHTML = renderHomePrerender();
    document.body.append(container);
    const serverHeading = container.querySelector(".sarkari-hero h1");
    const recoverableErrors: unknown[] = [];
    let hydratedRoot: Root | undefined;

    try {
      act(() => {
        hydratedRoot = hydrateRoot(container, <App />, {
          identifierPrefix: HOME_PRERENDER_IDENTIFIER_PREFIX,
          onRecoverableError: (error) => recoverableErrors.push(error),
        });
      });

      expect(recoverableErrors).toEqual([]);
      expect(container.querySelector(".sarkari-hero h1")).toBe(serverHeading);
    } finally {
      act(() => hydratedRoot?.unmount());
      container.remove();
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  });

  it("strips a sentinel-bounded homepage without parsing nested markup", () => {
    const html = `<body>${HOME_PRERENDER_START}<div id="root" data-sarkari-prerender="home"><div class="sarkari-site"><div><div>home only</div></div></div></div>${HOME_PRERENDER_END}<script type="module"></script></body>`;
    const stripped = stripHomePrerenderFromHtml(html);
    expect(stripped).toBe('<body><div id="root"></div><script type="module"></script></body>');
    expect(stripped).not.toContain("home only");
    expect(() => stripHomePrerenderFromHtml(`${HOME_PRERENDER_START}<div id="root"></div>`)).toThrow(/Malformed/);
  });

  it("restores one ordinary blocking stylesheet from the exact-home CSS gate", () => {
    const blocking = '<link rel="stylesheet" crossorigin href="/assets/index-test.css">';
    const gated = `<head>${HOME_CRITICAL_CSS_START}<style data-sarkari-home-critical media="not all">body{margin:0}</style><link rel="stylesheet" href="/assets/index-test.css" media="print" blocking="render" data-sarkari-full-stylesheet><script data-sarkari-home-css-gate>gate()</script><noscript data-sarkari-full-css-fallback>${blocking}</noscript>${HOME_CRITICAL_CSS_END}</head>`;
    expect(restoreBlockingStylesheetFromHomeCriticalCss(gated)).toBe(`<head>${blocking}</head>`);
    expect(() => restoreBlockingStylesheetFromHomeCriticalCss(`${HOME_CRITICAL_CSS_START}<style></style>${HOME_CRITICAL_CSS_END}`)).toThrow(/fallback/);
    expect(() => restoreBlockingStylesheetFromHomeCriticalCss(`${HOME_CRITICAL_CSS_START}<noscript data-sarkari-full-css-fallback><link rel="stylesheet" href="/assets/index.css" media="print"></noscript>${HOME_CRITICAL_CSS_END}`)).toThrow(/invalid/);
  });
});
