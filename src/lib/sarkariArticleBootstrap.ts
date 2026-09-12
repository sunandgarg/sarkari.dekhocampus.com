import { SARKARI_SITE_SCOPE } from "./siteScope";

export const PUBLIC_ARTICLE_LIST_FIELDS =
  "id,site_scope,status,title,slug,description,vertical,category,author,featured_image,views,tags,is_active,featured_rank,created_at,updated_at";

export const PUBLIC_ARTICLE_DETAIL_FIELDS =
  `${PUBLIC_ARTICLE_LIST_FIELDS},content,meta_title,meta_description,meta_keywords`;

export const SARKARI_ARTICLE_BOOTSTRAP_ID = "sarkari-article-bootstrap";
export const SARKARI_ARTICLE_BOOTSTRAP_VERSION = 1 as const;
const MAX_BOOTSTRAP_SERIALIZED_CHARS = 4_000_000;

export type PublicSarkariArticle = {
  id: string;
  site_scope: typeof SARKARI_SITE_SCOPE;
  status: string;
  title: string;
  slug: string;
  description: string;
  content?: string;
  vertical: string;
  category: string;
  author: string;
  featured_image: string;
  views: number;
  tags: string[];
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  author_id?: string | null;
  is_active: boolean;
  featured_rank?: number | null;
  created_at: string;
  updated_at: string;
};

type BootstrapEnvelope = {
  version: typeof SARKARI_ARTICLE_BOOTSTRAP_VERSION;
  article: PublicSarkariArticle;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boundedString(value: unknown, maximum: number, required = false) {
  if ((value === null || value === undefined) && !required) return "";
  if (typeof value !== "string" || value.length > maximum || (required && !value.trim())) return undefined;
  return value;
}

export function normalizeSarkariArticleSlug(raw: unknown) {
  let decoded = String(raw ?? "");
  try { decoded = decodeURIComponent(decoded); } catch { return ""; }
  return decoded
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

export function isPublishedArticleStatus(value: unknown) {
  return typeof value === "string" && value.trim().toLowerCase() === "published";
}

/**
 * Treat the edge payload as untrusted input. Only a canonical, public Sarkari
 * article can seed the browser cache; publication state is normalized so old
 * lowercase rows behave exactly like current `Published` rows.
 */
export function validatePublicSarkariArticle(value: unknown, expectedSlug: string): PublicSarkariArticle | undefined {
  if (!isRecord(value)) return undefined;
  const canonicalSlug = normalizeSarkariArticleSlug(expectedSlug);
  if (!canonicalSlug || canonicalSlug !== expectedSlug || value.slug !== canonicalSlug) return undefined;
  if (value.site_scope !== SARKARI_SITE_SCOPE) return undefined;
  if (!isPublishedArticleStatus(value.status)) return undefined;
  if (value.is_active !== true && value.is_active !== 1) return undefined;

  const id = boundedString(value.id, 200, true);
  const title = boundedString(value.title, 1_000, true);
  const description = boundedString(value.description, 20_000);
  const content = boundedString(value.content, 500_000);
  const vertical = boundedString(value.vertical, 300);
  const category = boundedString(value.category, 300);
  const author = boundedString(value.author, 300);
  const featuredImage = boundedString(value.featured_image, 2_048);
  const metaTitle = boundedString(value.meta_title, 1_000);
  const metaDescription = boundedString(value.meta_description, 5_000);
  const metaKeywords = boundedString(value.meta_keywords, 5_000);
  const createdAt = boundedString(value.created_at, 64, true);
  const updatedAt = boundedString(value.updated_at, 64) || createdAt;
  if (!id || !title || description === undefined || content === undefined || vertical === undefined ||
      category === undefined || author === undefined || featuredImage === undefined || metaTitle === undefined ||
      metaDescription === undefined || metaKeywords === undefined || !createdAt || !updatedAt) return undefined;

  if (value.tags !== null && value.tags !== undefined && !Array.isArray(value.tags)) return undefined;
  const rawTags = Array.isArray(value.tags) ? value.tags : [];
  if (rawTags.length > 100 || rawTags.some((tag) => typeof tag !== "string" || tag.length > 200)) return undefined;
  const tags = (rawTags as string[]).map((tag) => tag.trim()).filter(Boolean);
  if (typeof value.views !== "number" || !Number.isFinite(value.views) || value.views < 0) return undefined;
  const views = value.views;
  let featuredRank: number | null = null;
  if (value.featured_rank !== null && value.featured_rank !== undefined) {
    if (typeof value.featured_rank !== "number" || !Number.isFinite(value.featured_rank)) return undefined;
    featuredRank = value.featured_rank;
  }

  return {
    id,
    site_scope: SARKARI_SITE_SCOPE,
    status: "Published",
    title,
    slug: canonicalSlug,
    description,
    content,
    vertical,
    category,
    author,
    featured_image: featuredImage,
    views,
    tags,
    meta_title: metaTitle,
    meta_description: metaDescription,
    meta_keywords: metaKeywords,
    is_active: true,
    featured_rank: featuredRank,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

export function serializeSarkariArticleBootstrap(article: PublicSarkariArticle) {
  const envelope: BootstrapEnvelope = { version: SARKARI_ARTICLE_BOOTSTRAP_VERSION, article };
  return JSON.stringify(envelope)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function parseSarkariArticleBootstrap(
  serialized: string,
  expectedSlug: string,
  pathname: string,
): PublicSarkariArticle | undefined {
  if (serialized.length > MAX_BOOTSTRAP_SERIALIZED_CHARS) return undefined;
  const canonicalSlug = normalizeSarkariArticleSlug(expectedSlug);
  if (!canonicalSlug || canonicalSlug !== expectedSlug) return undefined;
  if (pathname !== `/news/${encodeURIComponent(canonicalSlug)}`) return undefined;

  try {
    const envelope: unknown = JSON.parse(serialized);
    if (!isRecord(envelope) || envelope.version !== SARKARI_ARTICLE_BOOTSTRAP_VERSION) return undefined;
    return validatePublicSarkariArticle(envelope.article, canonicalSlug);
  } catch {
    return undefined;
  }
}
