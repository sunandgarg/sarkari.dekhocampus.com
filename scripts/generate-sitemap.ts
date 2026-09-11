/** Article-only sitemap generator for Sarkari DekhoCampus. */
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from "fs";
import { resolve } from "path";
import { loadEnv } from "vite";
import { SITE_URL } from "../src/lib/constant";
import { SARKARI_SITE_SCOPE } from "../src/lib/siteScope";
import {
  buildSitemapDocuments,
  fetchPublishedArticleEntries,
  type SitemapEntry,
} from "../src/lib/sarkariSitemapArticles";

const BUILD_MODE = process.env.SITEMAP_MODE || process.env.NODE_ENV || "production";
const fileEnv = loadEnv(BUILD_MODE, process.cwd(), "");
const env = { ...fileEnv, ...process.env };
const BASE_URL = (env.SITEMAP_BASE_URL || SITE_URL).replace(/\/+$/, "");
const API_URL = (env.SITEMAP_API_URL === "none" ? "" : env.SITEMAP_API_URL || env.VITE_API_URL || "").replace(/\/+$/, "");
const ALLOW_MISSING_ARTICLE_API = BUILD_MODE !== "production" && env.SITEMAP_ALLOW_MISSING_ARTICLE_API === "true";

async function fetchPublishedArticles(): Promise<SitemapEntry[]> {
  if (!API_URL && !ALLOW_MISSING_ARTICLE_API) {
    throw new Error("[sitemap] SITEMAP_API_URL (or VITE_API_URL) is required for a complete production sitemap");
  }

  try {
    if (!API_URL) return [];
    return await fetchPublishedArticleEntries({ apiUrl: API_URL, siteScope: SARKARI_SITE_SCOPE });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (ALLOW_MISSING_ARTICLE_API) {
      console.warn(`[sitemap] article API unavailable in explicitly opted-in local mode: ${message}`);
      return [];
    }
    throw new Error(`[sitemap] Unable to build a complete article sitemap: ${message}`);
  }
}

const dynamicArticles = await fetchPublishedArticles();
const fixed: SitemapEntry[] = [
  { path: "/", changefreq: "hourly", priority: "1.0" },
  { path: "/news", changefreq: "hourly", priority: "0.9" },
  ...["Latest Jobs", "Results", "Admit Card", "Answer Key", "Admissions", "Syllabus", "Scholarships"].map((category) => ({
    path: `/?category=${encodeURIComponent(category)}`,
    changefreq: "daily",
    priority: "0.8",
  })),
];

const unique = new Map<string, SitemapEntry>();
for (const entry of [...fixed, ...dynamicArticles]) unique.set(entry.path, entry);
const entries = [...unique.values()];
const { indexXml, shards } = buildSitemapDocuments(BASE_URL, entries);
const distDirectory = resolve("dist");

mkdirSync(distDirectory, { recursive: true });
for (const filename of readdirSync(distDirectory)) {
  if (/^sitemap-\d+\.xml$/.test(filename)) unlinkSync(resolve(distDirectory, filename));
}
for (const shard of shards) writeFileSync(resolve(distDirectory, shard.filename), shard.xml);
writeFileSync(resolve(distDirectory, "sitemap.xml"), indexXml);
writeFileSync(resolve(distDirectory, "sitemap-index.xml"), indexXml);
console.log(`sitemap written - ${entries.length} article portal URLs across ${shards.length} shard(s)`);
