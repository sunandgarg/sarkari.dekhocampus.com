import { describe, expect, it, vi } from "vitest";
import {
  ARTICLE_SITEMAP_PAGE_SIZE,
  buildSarkariFixedSitemapEntries,
  buildSitemapDocuments,
  fetchPublishedArticleEntries,
  SITEMAP_MAX_URLS_PER_SHARD,
} from "./sarkariSitemapArticles";

function response(rows: unknown[], contentRange?: string) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => contentRange || null },
    json: async () => rows,
  };
}

describe("Sarkari article sitemap pagination", () => {
  it("requests every article in batches that respect the backend limit", async () => {
    const firstPage = Array.from({ length: ARTICLE_SITEMAP_PAGE_SIZE }, (_, index) => ({
      slug: `job-${String(index).padStart(4, "0")}`,
      updated_at: "2026-09-10T08:00:00.000Z",
    }));
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(response(firstPage, "0-999/1002"))
      .mockResolvedValueOnce(response([
        { slug: "job-1000", updated_at: "2026-09-11T08:00:00.000Z" },
        { slug: "job-1001", updated_at: null },
      ], "1000-1001/1002"));

    const entries = await fetchPublishedArticleEntries({
      apiUrl: "https://api.example.test",
      siteScope: "sarkari",
      fetchPage,
    });

    expect(entries).toHaveLength(1002);
    expect(entries[0]).toEqual({
      path: "/news/job-0000",
      lastmod: "2026-09-10",
      changefreq: "daily",
      priority: "0.8",
      category: "Latest Jobs",
    });
    expect(entries.at(-1)?.path).toBe("/news/job-1001");
    expect(fetchPage).toHaveBeenCalledTimes(2);

    const firstUrl = fetchPage.mock.calls[0][0] as URL;
    const secondUrl = fetchPage.mock.calls[1][0] as URL;
    expect(firstUrl.searchParams.get("limit")).toBe("1000");
    expect(firstUrl.searchParams.get("offset")).toBe("0");
    expect(firstUrl.searchParams.get("site_scope")).toBe("eq.sarkari");
    expect(firstUrl.searchParams.get("status")).toBe("eq.Published");
    expect(firstUrl.searchParams.get("is_active")).toBe("eq.true");
    expect(firstUrl.searchParams.get("order")).toBe("slug.asc");
    expect(firstUrl.searchParams.get("select")).toBe("slug,updated_at,category,vertical");
    expect(secondUrl.searchParams.get("offset")).toBe("1000");
  });

  it("retains normalized categories so empty archives stay out of the sitemap", async () => {
    const entries = await fetchPublishedArticleEntries({
      apiUrl: "https://api.example.test",
      siteScope: "sarkari",
      fetchPage: async () => response([
        { slug: "bank-result", category: "Exam Results" },
        { slug: "railway-job", vertical: "Recruitment" },
        { slug: "exam-result", category: "", vertical: "Exam Results" },
      ], "0-2/3"),
    });

    expect(entries.map((entry) => entry.category)).toEqual(["Results", "Latest Jobs", "Results"]);
  });

  it("keeps paging when content-range reports more rows than a short page", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(response([{ slug: "one" }], "0-0/2"))
      .mockResolvedValueOnce(response([{ slug: "two" }], "1-1/2"));

    const entries = await fetchPublishedArticleEntries({
      apiUrl: "https://api.example.test",
      siteScope: "sarkari",
      pageSize: 10,
      fetchPage,
    });

    expect(entries.map((entry) => entry.path)).toEqual(["/news/one", "/news/two"]);
    expect((fetchPage.mock.calls[1][0] as URL).searchParams.get("offset")).toBe("1");
  });

  it("rejects API failures instead of returning a partial sitemap", async () => {
    await expect(fetchPublishedArticleEntries({
      apiUrl: "https://api.example.test",
      siteScope: "sarkari",
      maxAttempts: 2,
      retryDelay: async () => undefined,
      fetchPage: async () => ({
        ok: false,
        status: 503,
        json: async () => [],
      }),
    })).rejects.toThrow("offset 0 (HTTP 503)");
  });

  it("retries a transient Prisma connection-pool response and keeps the sitemap complete", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ code: "P2024" }),
      })
      .mockResolvedValueOnce(response([{ slug: "recovered-job" }], "0-0/1"));

    const entries = await fetchPublishedArticleEntries({
      apiUrl: "https://api.example.test",
      siteScope: "sarkari",
      fetchPage,
      retryDelay: async () => undefined,
    });

    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(entries.map((entry) => entry.path)).toEqual(["/news/recovered-job"]);
  });

  it("does not retry a non-transient client error", async () => {
    const fetchPage = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ code: "INVALID_SITE_SCOPE" }),
    });

    await expect(fetchPublishedArticleEntries({
      apiUrl: "https://api.example.test",
      siteScope: "sarkari",
      fetchPage,
    })).rejects.toThrow("HTTP 400, INVALID_SITE_SCOPE");
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("rejects page sizes above the REST service ceiling", async () => {
    await expect(fetchPublishedArticleEntries({
      apiUrl: "https://api.example.test",
      siteScope: "sarkari",
      pageSize: ARTICLE_SITEMAP_PAGE_SIZE + 1,
    })).rejects.toThrow("between 1 and 1000");
  });
});

describe("Sarkari sitemap shards", () => {
  it("emits root only for an empty portal and only populated category archives otherwise", () => {
    expect(buildSarkariFixedSitemapEntries([]).map((entry) => entry.path)).toEqual(["/"]);
    expect(buildSarkariFixedSitemapEntries([
      { path: "/news/result", changefreq: "daily", priority: "0.8", category: "Results" },
      { path: "/news/job", changefreq: "daily", priority: "0.8", category: "Latest Jobs" },
    ]).map((entry) => entry.path)).toEqual([
      "/",
      "/?category=Latest%20Jobs",
      "/?category=Results",
    ]);
  });

  it("keeps every URL and references every bounded shard from the index", () => {
    const entries = [
      { path: "/", changefreq: "hourly", priority: "1.0" },
      { path: "/?category=Latest%20Jobs", changefreq: "daily", priority: "0.8" },
      { path: "/news/job-one", lastmod: "2026-09-10" },
      { path: "/news/job-two", lastmod: "2026-09-11" },
      { path: "/news/job-three" },
    ];

    const documents = buildSitemapDocuments("https://sarkari.dekhocampus.com/", entries, 2);

    expect(documents.shards.map((shard) => shard.urlCount)).toEqual([2, 2, 1]);
    expect(documents.shards.every((shard) => shard.urlCount <= 2)).toBe(true);
    expect(documents.indexXml.match(/<sitemap>/g)).toHaveLength(3);
    for (const shard of documents.shards) {
      expect(documents.indexXml).toContain(`https://sarkari.dekhocampus.com/${shard.filename}`);
    }
    expect(documents.shards[0].xml).toContain("https://sarkari.dekhocampus.com/");
    expect(documents.shards[0].xml).toContain("?category=Latest%20Jobs");
    expect(documents.shards.map((shard) => shard.xml).join("\n")).toContain("/news/job-three");
  });

  it("never permits a shard above the 50,000 URL protocol limit", () => {
    expect(() => buildSitemapDocuments(
      "https://sarkari.dekhocampus.com",
      [{ path: "/" }],
      SITEMAP_MAX_URLS_PER_SHARD + 1,
    )).toThrow("between 1 and 50000");
  });

  it("splits the 50,001st URL into a second shard by default", () => {
    const entries = Array.from(
      { length: SITEMAP_MAX_URLS_PER_SHARD + 1 },
      (_, index) => ({ path: `/news/job-${index}` }),
    );

    const documents = buildSitemapDocuments("https://sarkari.dekhocampus.com", entries);

    expect(documents.shards.map((shard) => shard.urlCount)).toEqual([50_000, 1]);
    expect(documents.indexXml).toContain("/sitemap-1.xml");
    expect(documents.indexXml).toContain("/sitemap-2.xml");
  });
});
