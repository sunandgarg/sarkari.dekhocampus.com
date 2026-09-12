import type { PropsWithChildren } from "react";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSarkariHomepageArticles } from "./useArticlesData";
import { SARKARI_CATEGORIES, type SarkariCategory } from "@/lib/sarkariCategories";
import type { SarkariHomeFeed } from "@/lib/sarkariHomeFeed";

const card = (category: SarkariCategory, index = 1) => ({
  id: `${category.toLowerCase().replace(/ /g, "-")}-${index}`,
  slug: `${category.toLowerCase().replace(/ /g, "-")}-${index}`,
  title: `${category} update`,
  description: "Important dates.",
  category,
  createdAt: "2026-09-13T00:00:00.000Z",
});

const feed: SarkariHomeFeed = {
  version: 1,
  latest: [card("Results")],
  byCategory: Object.fromEntries(SARKARI_CATEGORIES.map((category) => [category, [card(category)]])) as SarkariHomeFeed["byCategory"],
};

function renderHomeFeedHook() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, gcTime: Infinity } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, ...renderHook(() => useSarkariHomepageArticles(SARKARI_CATEGORIES), { wrapper }) };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useSarkariHomepageArticles aggregate feed", () => {
  it("uses one same-origin edge feed instead of nine REST article queries", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(feed)));
    const { result, queryClient } = renderHomeFeedHook();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy.mock.calls[0][0]).toBe("/api/home-feed");
    expect(fetchSpy.mock.calls.flat().join(" ")).not.toContain("/v1/rest/articles");
    expect(result.current.data?.latest[0]).toMatchObject({
      site_scope: "sarkari",
      status: "Published",
      category: "Results",
      is_active: true,
    });
    expect(Object.keys(result.current.data?.byCategory || {})).toEqual(SARKARI_CATEGORIES);
    queryClient.clear();
  });

  it("falls back once to the single AWS aggregate and never fans out REST reads", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(feed)));
    const { result, queryClient } = renderHomeFeedHook();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[0][0]).toBe("/api/home-feed");
    expect(String(fetchSpy.mock.calls[1][0])).toMatch(/\/v1\/functions\/sarkari-home-feed$/);
    expect(fetchSpy.mock.calls.flat().join(" ")).not.toContain("/v1/rest/articles");
    expect(warning.mock.calls.flat().join(" ")).toContain("sarkari_home_feed_edge_fallback");
    queryClient.clear();
  });

  it("surfaces a total feed outage after exactly two bounded requests", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("unavailable", { status: 503 }));
    const { result, queryClient } = renderHomeFeedHook();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls.flat().join(" ")).not.toContain("/v1/rest/articles");
    queryClient.clear();
  });
});
