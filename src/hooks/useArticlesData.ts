import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { backendClient } from "@/integrations/backend/client";
import { toast } from "sonner";
import { SARKARI_SITE_SCOPE } from "@/lib/siteScope";
import { runWithConcurrency } from "@/lib/runWithConcurrency";
import {
  PUBLIC_ARTICLE_DETAIL_FIELDS,
  PUBLIC_ARTICLE_LIST_FIELDS,
  type PublicSarkariArticle,
  validatePublicSarkariArticle,
} from "@/lib/sarkariArticleBootstrap";
import { readSarkariArticleBootstrap } from "@/lib/readSarkariArticleBootstrap";

export { PUBLIC_ARTICLE_DETAIL_FIELDS, PUBLIC_ARTICLE_LIST_FIELDS } from "@/lib/sarkariArticleBootstrap";

function isPendingReview(response: { status?: number | null }) {
  return response.status === 202;
}

export type DbArticle = PublicSarkariArticle;

export const SARKARI_ARCHIVE_PAGE_SIZE = 9;
export const SARKARI_HOME_READ_CONCURRENCY = 2;
const LEGACY_PUBLIC_LIST_LIMIT = 60;

const publicArticlesQuery = (fields = PUBLIC_ARTICLE_LIST_FIELDS) =>
  backendClient
    .from("articles")
    .select(fields)
    .eq("site_scope", SARKARI_SITE_SCOPE)
    .eq("status", "Published")
    .eq("is_active", true);

const rowsFrom = (data: unknown) => (Array.isArray(data) ? data : []) as DbArticle[];

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

/** Fetches at most nine cards per homepage rail, regardless of table size. */
export function useSarkariHomepageArticles(categories: readonly string[], enabled = true) {
  const categoryKey = categories.join("|");
  return useQuery({
    queryKey: ["sarkari-home-articles", SARKARI_SITE_SCOPE, categoryKey],
    enabled,
    queryFn: async (): Promise<SarkariHomepageArticles> => {
      const readTasks = [
        () => publicArticlesQuery()
          .not("featured_rank", "is", null)
          .order("featured_rank", { ascending: true })
          .limit(SARKARI_ARCHIVE_PAGE_SIZE),
        () => publicArticlesQuery()
          .order("created_at", { ascending: false })
          .limit(SARKARI_ARCHIVE_PAGE_SIZE),
        ...categories.map((category) => () => publicArticlesQuery()
          .eq("category", category)
          .order("created_at", { ascending: false })
          .limit(SARKARI_ARCHIVE_PAGE_SIZE)),
      ];
      const [pinnedResponse, latestResponse, ...categoryResponses] =
        await runWithConcurrency(readTasks, SARKARI_HOME_READ_CONCURRENCY);

      const responses = [pinnedResponse, latestResponse, ...categoryResponses];
      const failed = responses.find((response) => response.error);
      if (failed?.error) throw failed.error;

      const seenLatest = new Set<string>();
      const latest = [...rowsFrom(pinnedResponse.data), ...rowsFrom(latestResponse.data)]
        .filter((article) => !seenLatest.has(article.id) && seenLatest.add(article.id))
        .slice(0, SARKARI_ARCHIVE_PAGE_SIZE);

      const byCategory = Object.fromEntries(
        categories.map((category, index) => [category, rowsFrom(categoryResponses[index]?.data)])
      );
      return { latest, byCategory };
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
      toast.success(result.pendingReview ? "Article draft submitted for admin review." : "Article saved!");
    },
    onError: (e) => toast.error(`Failed: ${e.message}`),
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
      toast.success("Article deleted!");
    },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });
}
