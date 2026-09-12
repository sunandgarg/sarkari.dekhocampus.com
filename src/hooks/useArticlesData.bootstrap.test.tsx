import type { PropsWithChildren } from "react";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDbArticle } from "./useArticlesData";
import {
  SARKARI_ARTICLE_BOOTSTRAP_ID,
  serializeSarkariArticleBootstrap,
  type PublicSarkariArticle,
} from "@/lib/sarkariArticleBootstrap";

const article: PublicSarkariArticle = {
  id: "bootstrap-article-1",
  site_scope: "sarkari",
  status: "Published",
  title: "Railway Clerk 2026",
  slug: "railway-clerk-2026",
  description: "Important dates and eligibility.",
  content: "Full public article content.",
  vertical: "Government Jobs",
  category: "Latest Jobs",
  author: "Sarkari Desk",
  featured_image: "https://cdn.example.com/railway.webp",
  views: 42,
  tags: ["Railway", "Clerk"],
  meta_title: "Railway Clerk 2026",
  meta_description: "Important dates and eligibility.",
  meta_keywords: "railway,clerk",
  is_active: true,
  featured_rank: 1,
  created_at: "2026-09-12T00:00:00.000Z",
  updated_at: "2026-09-12T01:00:00.000Z",
};

afterEach(() => {
  cleanup();
  document.getElementById(SARKARI_ARTICLE_BOOTSTRAP_ID)?.remove();
  window.history.replaceState({}, "", "/");
  vi.restoreAllMocks();
});

describe("useDbArticle edge bootstrap", () => {
  it("hydrates matching initial data without a duplicate AWS detail request", async () => {
    window.history.replaceState({}, "", `/news/${article.slug}`);
    const script = document.createElement("script");
    script.id = SARKARI_ARTICLE_BOOTSTRAP_ID;
    script.type = "application/json";
    script.textContent = serializeSarkariArticleBootstrap(article);
    document.body.appendChild(script);

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("unexpected detail fetch"));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDbArticle(article.slug), { wrapper });
    expect(result.current.data).toEqual(article);
    expect(result.current.isSuccess).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchSpy).not.toHaveBeenCalled();
    queryClient.clear();
  });

  it("treats a wrong-tenant client-navigation response as unavailable, not not-found", async () => {
    window.history.replaceState({}, "", `/news/${article.slug}`);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify([
      { ...article, site_scope: "dekhocampus" },
    ]), { status: 200, headers: { "Content-Type": "application/json" } }));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDbArticle(article.slug), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledOnce();
    queryClient.clear();
  });
});
