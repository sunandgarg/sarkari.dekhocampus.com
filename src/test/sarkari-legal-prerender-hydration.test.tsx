import { QueryClientProvider } from "@tanstack/react-query";
import { act, waitFor } from "@testing-library/react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import App, { AppRuntime, createAppQueryClient } from "@/App";
import {
  hasHydratableLegalPrerender,
  HOME_PRERENDER_ATTRIBUTE,
  LEGAL_PRERENDER_IDENTIFIER_PREFIX,
  legalPrerenderValue,
} from "@/lib/homePrerender";

async function renderHydrationFixture() {
  const queryClient = createAppQueryClient();
  const app = (
    <QueryClientProvider client={queryClient}>
      <StaticRouter location="/legal/privacy-policy">
        <AppRuntime />
      </StaticRouter>
    </QueryClientProvider>
  );

  try {
    // The first legacy render starts the same React.lazy import used by the
    // browser. Once fulfilled, the second render is the exact full AppRuntime
    // tree and can be hydrated in this single-renderer JSDOM process.
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const markup = renderToString(app, {
        identifierPrefix: LEGAL_PRERENDER_IDENTIFIER_PREFIX,
      });
      if (markup.includes("<h1>Privacy Policy</h1>")) return markup;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("The lazy legal route did not resolve for the hydration fixture");
  } finally {
    queryClient.clear();
  }
}

describe("Sarkari legal prerender hydration", () => {
  it("accepts only a known public route carrying its own marker", () => {
    const root = document.createElement("div");
    root.setAttribute(HOME_PRERENDER_ATTRIBUTE, legalPrerenderValue("/legal/privacy-policy"));
    root.innerHTML = '<div class="sarkari-site"></div>';

    expect(hasHydratableLegalPrerender(root, {
      pathname: "/legal/privacy-policy",
      search: "?utm_source=test",
    })).toBe(true);
    expect(hasHydratableLegalPrerender(root, {
      pathname: "/legal/terms-of-service",
      search: "",
    })).toBe(false);
    expect(hasHydratableLegalPrerender(root, {
      pathname: "/__sarkari_legal_privacy-policy.asset",
      search: "",
    })).toBe(false);
  });

  it("hydrates the server-rendered legal app without replacing its DOM or recovering", async () => {
    vi.stubGlobal("__APP_BUILD_YEAR__", 2026);
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("requestIdleCallback", vi.fn(() => 1));
    vi.stubGlobal("cancelIdleCallback", vi.fn());
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => undefined)));
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    window.history.replaceState({}, "", "/legal/privacy-policy");
    document.title = "Before hydration";

    const container = document.createElement("div");
    container.id = "root";
    container.setAttribute(
      HOME_PRERENDER_ATTRIBUTE,
      legalPrerenderValue("/legal/privacy-policy"),
    );
    container.innerHTML = await renderHydrationFixture();
    document.body.append(container);
    const serverSite = container.querySelector(".sarkari-site");
    const serverHeading = container.querySelector("h1");
    const serverArticle = container.querySelector("article");
    const recoverableErrors: unknown[] = [];
    let hydratedRoot: Root | undefined;

    try {
      expect(serverSite).not.toBeNull();
      expect(serverHeading).not.toBeNull();
      expect(serverArticle).not.toBeNull();
      expect(hasHydratableLegalPrerender(container, window.location)).toBe(true);
      await act(async () => {
        hydratedRoot = hydrateRoot(container, <App />, {
          identifierPrefix: LEGAL_PRERENDER_IDENTIFIER_PREFIX,
          onRecoverableError: (error) => recoverableErrors.push(error),
        });
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(document.title).toBe("Privacy Policy | Sarkari DekhoCampus");
      });

      expect(recoverableErrors).toEqual([]);
      expect(container.querySelector(".sarkari-site")).toBe(serverSite);
      expect(container.querySelector("h1")).toBe(serverHeading);
      expect(container.querySelector("article")).toBe(serverArticle);
    } finally {
      act(() => hydratedRoot?.unmount());
      container.remove();
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  });
});
