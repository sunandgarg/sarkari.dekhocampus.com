import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { backendClient } from "@/integrations/backend/client";
import { functionUrl } from "@/lib/backendMode";
import { SARKARI_SITE_SCOPE } from "@/lib/siteScope";
import {
  PUBLIC_ARTICLE_DETAIL_FIELDS,
  PUBLIC_ARTICLE_LIST_FIELDS,
  type PublicSarkariArticle,
  validatePublicSarkariArticle,
} from "@/lib/sarkariArticleBootstrap";
import { readSarkariArticleBootstrap } from "@/lib/readSarkariArticleBootstrap";
import {
  readBoundedSarkariHomeFeed,
  type SarkariHomeFeed,
  type SarkariHomeFeedCard,
} from "@/lib/sarkariHomeFeed";

export { PUBLIC_ARTICLE_DETAIL_FIELDS, PUBLIC_ARTICLE_LIST_FIELDS } from "@/lib/sarkariArticleBootstrap";

function isPendingReview(response: { status?: number | null }) {
  return response.status === 202;
}

function notifyArticleMutation(kind: "success" | "error", message: string) {
  // Admin-only mutation feedback must not pull Sonner into the public
  // homepage entry chunk, which imports the read hooks from this module.
  void import("sonner")
    .then(({ toast }) => toast[kind](message))
    .catch(() => console.warn(JSON.stringify({ event: "sarkari_admin_toast_load_failed" })));
}

export type DbArticle = PublicSarkariArticle;

export const SARKARI_ARCHIVE_PAGE_SIZE = 9;
const LEGACY_PUBLIC_LIST_LIMIT = 60;
const SARKARI_HOME_EDGE_URL = "/api/home-feed";
const SARKARI_HOME_REQUEST_TIMEOUT_MS = 4_000;

const publicArticlesQuery = (fields = PUBLIC_ARTICLE_LIST_FIELDS) =>
  backendClient
    .from("articles")
    .select(fields)
    .eq("site_scope", SARKARI_SITE_SCOPE)
    .eq("status", "Published")
    .eq("is_active", true);

const rowsFrom = (data: unknown): DbArticle[] => (Array.isArray(data) ? data : [])
  .flatMap((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return [];
    const slug = (row as Record<string, unknown>).slug;
    if (typeof slug !== "string") return [];
    const article = validatePublicSarkariArticle(row, slug);
    return article ? [article] : [];
  });

/**
 * Bounded compatibility feed for legacy public components. New homepage and
 * archive surfaces use the purpose-built hooks below so table growth never
 * increases the browser payload.
 */
export function useDbArticles(limit = LEGACY_PUBLIC_LIST_LIMIT) {
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit || LEGACY_PUBLIC_LIST_LIMIT)));
  return useQuery({
    queryKey: ["db-articles", SARKARI_SITE_SCOPE, safeLimit],
    queryFn: async () => {
      const { data, error } = await publicArticlesQuery()
        .order("created_at", { ascending: false })
        .limit(safeLimit);
      if (error) throw error;
      return rowsFrom(data);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export type SarkariHomepageArticles = {
  latest: DbArticle[];
  byCategory: Record<string, DbArticle[]>;
};

function homeFeedCardToArticle(card: SarkariHomeFeedCard): DbArticle {
  return {
    id: card.id,
    site_scope: SARKARI_SITE_SCOPE,
    status: "Published",
    title: card.title,
    slug: card.slug,
    description: card.description,
    vertical: card.category,
    category: card.category,
    author: "",
    featured_image: "",
    views: 0,
    tags: [],
    is_active: true,
    featured_rank: null,
    created_at: card.createdAt,
    updated_at: card.createdAt,
  };
}

async function fetchHomeFeed(url: string, signal?: AbortSignal) {
  const controller = new AbortController();
  const abortFromQuery = () => controller.abort(signal?.reason);
  if (signal?.aborted) abortFromQuery();
  else signal?.addEventListener("abort", abortFromQuery, { once: true });
  const timeout = setTimeout(() => controller.abort("SARKARI_HOME_FEED_TIMEOUT"), SARKARI_HOME_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
      credentials: "omit",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("SARKARI_HOME_FEED_REQUEST_FAILED");
    return await readBoundedSarkariHomeFeed(response);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromQuery);
  }
}

function homeFeedToArticles(feed: SarkariHomeFeed, categories: readonly string[]): SarkariHomepageArticles {
  return {
    latest: feed.latest.map(homeFeedCardToArticle),
    byCategory: Object.fromEntries(categories.map((category) => [
      category,
      (feed.byCategory[category as keyof typeof feed.byCategory] || []).map(homeFeedCardToArticle),
    ])),
  };
}

/** Fetches one bounded aggregate; an edge failure falls back to one AWS aggregate request. */
export function useSarkariHomepageArticles(categories: readonly string[], enabled = true) {
  const categoryKey = categories.join("|");
  return useQuery({
    queryKey: ["sarkari-home-articles", SARKARI_SITE_SCOPE, categoryKey],
    enabled,
    retry: false,
    queryFn: async ({ signal }): Promise<SarkariHomepageArticles> => {
      try {
        return homeFeedToArticles(await fetchHomeFeed(SARKARI_HOME_EDGE_URL, signal), categories);
      } catch (edgeError) {
        if (signal.aborted) throw edgeError;
        console.warn(JSON.stringify({ event: "sarkari_home_feed_edge_fallback" }));
        return homeFeedToArticles(await fetchHomeFeed(functionUrl("sarkari-home-feed"), signal), categories);
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

export const normalizeArticleSearch = (value: string | undefined) =>
  (value || "")
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

type PublicArticleArchiveOptions = {
  category?: string;
  search?: string;
  tag?: string;
  page?: number;
  enabled?: boolean;
};

export function usePublicArticleArchive({ category, search, tag, page = 1, enabled = true }: PublicArticleArchiveOptions) {
  const normalizedSearch = normalizeArticleSearch(search);
  const normalizedTag = normalizeArticleSearch(tag);
  const safePage = Math.max(1, Math.floor(page || 1));

  return useQuery({
    queryKey: ["sarkari-article-archive", SARKARI_SITE_SCOPE, category || "", normalizedSearch, normalizedTag, safePage],
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let query = publicArticlesQuery()
        .order("created_at", { ascending: false });

      if (category) query = query.eq("category", category);
      if (normalizedTag) query = query.contains("tags", [normalizedTag]);
      if (normalizedSearch) {
        const term = `%${normalizedSearch.replace(/\s+/g, "%")}%`;
        query = query.or([
          `title.ilike.${term}`,
          `description.ilike.${term}`,
          `category.ilike.${term}`,
          `vertical.ilike.${term}`,
        ].join(","));
      }

      const from = (safePage - 1) * SARKARI_ARCHIVE_PAGE_SIZE;
      const { data, error } = await query.range(from, from + SARKARI_ARCHIVE_PAGE_SIZE);
      if (error) throw error;
      const rows = rowsFrom(data);
      return {
        rows: rows.slice(0, SARKARI_ARCHIVE_PAGE_SIZE),
        hasNextPage: rows.length > SARKARI_ARCHIVE_PAGE_SIZE,
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useRelatedSarkariArticles(category: string | undefined, tags: string[], excludeSlug: string | undefined) {
  const normalizedTags = tags.map((tag) => tag.toLowerCase());
  return useQuery({
    queryKey: ["sarkari-related-articles", SARKARI_SITE_SCOPE, category || "", excludeSlug || "", normalizedTags.join("|")],
    enabled: Boolean(category && excludeSlug),
    queryFn: async () => {
      const [categoryResponse, latestResponse] = await Promise.all([
        publicArticlesQuery()
          .eq("category", category!)
          .order("created_at", { ascending: false })
          .limit(12),
        publicArticlesQuery()
          .order("created_at", { ascending: false })
          .limit(18),
      ]);
      if (categoryResponse.error) throw categoryResponse.error;
      if (latestResponse.error) throw latestResponse.error;

      const seen = new Set<string>();
      return [...rowsFrom(categoryResponse.data), ...rowsFrom(latestResponse.data)]
        .filter((article) => article.slug !== excludeSlug)
        .filter((article) => !seen.has(article.id) && seen.add(article.id))
        .map((article) => ({
          article,
          score:
            (article.category === category ? 10 : 0) +
            (article.tags || []).filter((tag) => normalizedTags.includes(tag.toLowerCase())).length * 3,
        }))
        .sort((left, right) => right.score - left.score)
        .slice(0, SARKARI_ARCHIVE_PAGE_SIZE)
        .map(({ article }) => article);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminArticles(search: string | undefined, page: number, pageSize: number) {
  const normalizedSearch = normalizeArticleSearch(search);
  const safePage = Math.max(1, Math.floor(page || 1));
  const safePageSize = Math.min(500, Math.max(1, Math.floor(pageSize || 20)));

  return useQuery({
    queryKey: ["db-articles-admin", SARKARI_SITE_SCOPE, normalizedSearch, safePage, safePageSize],
    queryFn: async () => {
      let query = backendClient
        .from("articles")
        .select("*", { count: "exact" })
        .eq("site_scope", SARKARI_SITE_SCOPE)
        .order("created_at", { ascending: false });

      if (normalizedSearch) {
        const ilikeTerm = `%${normalizedSearch.replace(/\s+/g, "%")}%`;
        query = query.or(
          [
            `title.ilike.${ilikeTerm}`,
            `slug.ilike.${ilikeTerm}`,
            `author.ilike.${ilikeTerm}`,
            `category.ilike.${ilikeTerm}`,
            `vertical.ilike.${ilikeTerm}`,
            `description.ilike.${ilikeTerm}`,
            `content.ilike.${ilikeTerm}`,
            `meta_title.ilike.${ilikeTerm}`,
            `meta_description.ilike.${ilikeTerm}`,
            `meta_keywords.ilike.${ilikeTerm}`,
          ].join(",")
        );
      }

      const from = (safePage - 1) * safePageSize;
      const { data, error, count } = await query.range(from, from + safePageSize - 1);
      if (error) throw error;
      return { rows: (data || []) as DbArticle[], total: count ?? 0 };
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useDbArticle(slug: string | undefined) {
  const bootstrapArticle = slug ? readSarkariArticleBootstrap(slug) : undefined;
  return useQuery({
    queryKey: ["db-article", SARKARI_SITE_SCOPE, slug],
    queryFn: async () => {
      const { data, error } = await backendClient
        .from("articles")
        .select(PUBLIC_ARTICLE_DETAIL_FIELDS)
        .eq("slug", slug!)
        .eq("site_scope", SARKARI_SITE_SCOPE)
        .eq("status", "Published")
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      if (data === null || data === undefined) return null;
      const article = validatePublicSarkariArticle(data, slug!);
      if (!article) throw new Error("Invalid public article response");
      return article;
    },
    enabled: !!slug,
    initialData: bootstrapArticle,
    initialDataUpdatedAt: bootstrapArticle ? Date.now() : undefined,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (article: Partial<DbArticle> & { slug: string; title: string }) => {
      let pendingReview = false;
      // Normalize slug: lowercase, spaces & special chars -> dashes
      const cleanSlug = (article.slug || "")
        .toString()
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const normalized = { ...article, slug: cleanSlug || article.slug, site_scope: SARKARI_SITE_SCOPE };
      if (normalized.id) {
        const { id, created_at, updated_at, ...rest } = normalized;
        const response = await backendClient
          .from("articles")
          .update(rest)
          .eq("id", id)
          .eq("site_scope", SARKARI_SITE_SCOPE);
        const { error } = response;
        if (error) throw error;
        pendingReview = isPendingReview(response);
      } else {
        const { id, created_at, updated_at, ...rest } = normalized;
        const response = await backendClient.from("articles").insert(rest);
        const { error } = response;
        if (error) throw error;
        pendingReview = isPendingReview(response);
      }
      return { pendingReview };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["db-articles"] });
      qc.invalidateQueries({ queryKey: ["db-articles-admin"] });
      notifyArticleMutation("success", result.pendingReview ? "Article draft submitted for admin review." : "Article saved!");
    },
    onError: (e) => notifyArticleMutation("error", `Failed: ${e.message}`),
  });
}

export function useDeleteArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await backendClient
        .from("articles")
        .delete()
        .eq("id", id)
        .eq("site_scope", SARKARI_SITE_SCOPE);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["db-articles"] });
      qc.invalidateQueries({ queryKey: ["db-articles-admin"] });
      notifyArticleMutation("success", "Article deleted!");
    },
    onError: (e) => notifyArticleMutation("error", `Failed: ${e.message}`),
  });
}
