/** Article-only sitemap generator for Sarkari DekhoCampus. */
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { loadEnv } from "vite";
import { SITE_URL } from "../src/lib/constant";
import { sarkariArticles } from "../src/data/sarkariArticles";

const fileEnv = loadEnv(process.env.NODE_ENV || "production", process.cwd(), "");
const env = { ...fileEnv, ...process.env };
const BASE_URL = (env.SITEMAP_BASE_URL || SITE_URL).replace(/\/+$/, "");
const API_URL = (env.SITEMAP_API_URL === "none" ? "" : env.SITEMAP_API_URL || env.VITE_API_URL || "").replace(/\/+$/, "");

type Entry = { path: string; lastmod?: string; changefreq?: string; priority?: string };

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&apos;");
}

async function fetchPublishedArticles(): Promise<Entry[]> {
  if (!API_URL) return [];
  try {
    const url = new URL("/v1/rest/articles", API_URL);
    url.searchParams.set("select", "slug,updated_at");
    url.searchParams.set("is_active", "eq.true");
    url.searchParams.set("status", "eq.Published");
    url.searchParams.set("limit", "50000");
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows = await response.json();
    return (Array.isArray(rows) ? rows : []).filter((row) => row.slug).map((row) => ({
      path: `/news/${row.slug}`,
      lastmod: row.updated_at ? new Date(row.updated_at).toISOString().slice(0, 10) : undefined,
      changefreq: "daily",
      priority: "0.8",
    }));
  } catch (error) {
    console.warn(`[sitemap] articles: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

const dynamicArticles = await fetchPublishedArticles();
const staticArticles: Entry[] = sarkariArticles.map((article) => ({
  path: `/news/${article.slug}`,
  lastmod: article.publishedAt,
  changefreq: "weekly",
  priority: "0.75",
}));
const fixed: Entry[] = [
  { path: "/", changefreq: "hourly", priority: "1.0" },
  { path: "/news", changefreq: "hourly", priority: "0.9" },
  ...["Latest Jobs", "Results", "Admit Card", "Answer Key", "Admissions", "Syllabus", "Scholarships"].map((category) => ({
    path: `/?category=${encodeURIComponent(category)}`,
    changefreq: "daily",
    priority: "0.8",
  })),
];

const unique = new Map<string, Entry>();
for (const entry of [...fixed, ...dynamicArticles, ...staticArticles]) unique.set(entry.path, entry);
const entries = [...unique.values()];
const urlset = entries.map((entry) => `  <url>\n    <loc>${escapeXml(`${BASE_URL}${entry.path}`)}</loc>${entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : ""}${entry.changefreq ? `\n    <changefreq>${entry.changefreq}</changefreq>` : ""}${entry.priority ? `\n    <priority>${entry.priority}</priority>` : ""}\n  </url>`).join("\n");
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlset}\n</urlset>\n`;
const index = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${escapeXml(`${BASE_URL}/sitemap.xml`)}</loc></sitemap>\n</sitemapindex>\n`;

mkdirSync(resolve("dist"), { recursive: true });
writeFileSync(resolve("dist/sitemap.xml"), xml);
writeFileSync(resolve("dist/sitemap-index.xml"), index);
console.log(`sitemap written - ${entries.length} article portal URLs`);
