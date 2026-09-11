export const ARTICLE_SITEMAP_PAGE_SIZE = 1_000;
export const SITEMAP_MAX_URLS_PER_SHARD = 50_000;

export type SitemapEntry = {
  path: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
};

export type ArticleSitemapEntry = {
  path: string;
  lastmod?: string;
  changefreq: "daily";
  priority: "0.8";
};

export type SitemapShard = {
  filename: string;
  xml: string;
  urlCount: number;
};

export type SitemapDocuments = {
  indexXml: string;
  shards: SitemapShard[];
};

type ArticleRow = {
  slug?: unknown;
  updated_at?: unknown;
};

type FetchResponse = {
  ok: boolean;
  status: number;
  headers?: { get(name: string): string | null };
  json(): Promise<unknown>;
};

type FetchPage = (url: URL) => Promise<FetchResponse>;

type FetchPublishedArticlesOptions = {
  apiUrl: string;
  siteScope: string;
  fetchPage?: FetchPage;
  pageSize?: number;
};

function lastModifiedDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

function totalFromContentRange(value: string | null | undefined) {
  const total = value?.split("/")[1];
  if (!total || total === "*") return undefined;
  const parsed = Number(total);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function renderUrlSet(baseUrl: string, entries: SitemapEntry[]) {
  const urls = entries.map((entry) => `  <url>\n    <loc>${escapeXml(`${baseUrl}${entry.path}`)}</loc>${entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : ""}${entry.changefreq ? `\n    <changefreq>${entry.changefreq}</changefreq>` : ""}${entry.priority ? `\n    <priority>${entry.priority}</priority>` : ""}\n  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** Creates protocol-compliant URL-set shards plus the index that references them. */
export function buildSitemapDocuments(
  baseUrl: string,
  entries: SitemapEntry[],
  shardSize = SITEMAP_MAX_URLS_PER_SHARD,
): SitemapDocuments {
  if (!Number.isSafeInteger(shardSize) || shardSize < 1 || shardSize > SITEMAP_MAX_URLS_PER_SHARD) {
    throw new Error(`Sitemap shard size must be between 1 and ${SITEMAP_MAX_URLS_PER_SHARD}`);
  }

  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  if (!normalizedBaseUrl) throw new Error("Sitemap base URL is not configured");

  const shards: SitemapShard[] = [];
  for (let start = 0; start < entries.length; start += shardSize) {
    const shardEntries = entries.slice(start, start + shardSize);
    const filename = `sitemap-${shards.length + 1}.xml`;
    shards.push({
      filename,
      xml: renderUrlSet(normalizedBaseUrl, shardEntries),
      urlCount: shardEntries.length,
    });
  }

  const sitemapNodes = shards
    .map((shard) => `  <sitemap><loc>${escapeXml(`${normalizedBaseUrl}/${shard.filename}`)}</loc></sitemap>`)
    .join("\n");
  const indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapNodes}\n</sitemapindex>\n`;

  return { indexXml, shards };
}

/**
 * Fetches every public Sarkari article without exceeding the REST service's
 * 1,000-row request ceiling. The content-range total lets this keep paging if
 * an intermediary returns a smaller page than requested.
 */
export async function fetchPublishedArticleEntries({
  apiUrl,
  siteScope,
  fetchPage = (url) => fetch(url),
  pageSize = ARTICLE_SITEMAP_PAGE_SIZE,
}: FetchPublishedArticlesOptions): Promise<ArticleSitemapEntry[]> {
  if (!apiUrl) throw new Error("Sitemap article API URL is not configured");
  if (!siteScope) throw new Error("Sitemap article site scope is not configured");
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > ARTICLE_SITEMAP_PAGE_SIZE) {
    throw new Error(`Sitemap article page size must be between 1 and ${ARTICLE_SITEMAP_PAGE_SIZE}`);
  }

  const entries: ArticleSitemapEntry[] = [];
  let offset = 0;

  for (;;) {
    const url = new URL("/v1/rest/articles", apiUrl);
    url.searchParams.set("select", "slug,updated_at");
    url.searchParams.set("site_scope", `eq.${siteScope}`);
    url.searchParams.set("is_active", "eq.true");
    url.searchParams.set("status", "eq.Published");
    url.searchParams.set("order", "slug.asc");
    url.searchParams.set("limit", String(pageSize));
    url.searchParams.set("offset", String(offset));

    const response = await fetchPage(url);
    if (!response.ok) {
      throw new Error(`Article sitemap request failed at offset ${offset} (HTTP ${response.status})`);
    }

    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) {
      throw new Error(`Article sitemap response at offset ${offset} was not an array`);
    }

    const rows = payload as ArticleRow[];
    for (const row of rows) {
      if (typeof row?.slug !== "string" || !row.slug.trim()) continue;
      entries.push({
        path: `/news/${row.slug.trim()}`,
        lastmod: lastModifiedDate(row.updated_at),
        changefreq: "daily",
        priority: "0.8",
      });
    }

    const total = totalFromContentRange(response.headers?.get("content-range"));
    offset += rows.length;

    if (rows.length === 0 || (total !== undefined ? offset >= total : rows.length < pageSize)) break;
  }

  return entries;
}
