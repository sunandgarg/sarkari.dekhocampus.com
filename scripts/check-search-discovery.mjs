#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const site = "https://sarkari.dekhocampus.com";

function read(path) {
  return readFileSync(resolve(dist, path), "utf8");
}

function fail(message) {
  throw new Error(`[discovery] ${message}`);
}

function exactly(html, pattern, label, expected = 1) {
  const count = html.match(pattern)?.length || 0;
  if (count !== expected) fail(`${label}: expected ${expected}, found ${count}`);
}

function assertIndexableDocument(html, canonical, label) {
  if (!html.includes('<html lang="en-IN">')) fail(`${label}: missing en-IN document language`);
  exactly(html, /<title\b[^>]*>[\s\S]*?<\/title>/gi, `${label} title`);
  exactly(html, /<meta\b(?=[^>]*\bname=["']description["'])[^>]*>/gi, `${label} description`);
  exactly(html, /<meta\b(?=[^>]*\bname=["']robots["'])[^>]*>/gi, `${label} robots`);
  exactly(html, /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/gi, `${label} canonical`);
  if (!html.includes(`href="${canonical}"`)) fail(`${label}: canonical does not equal ${canonical}`);
  if (/name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) fail(`${label}: canonical document is noindex`);
  exactly(html, /<main\b/gi, `${label} main landmark`);
  exactly(html, /<h1\b/gi, `${label} H1`);
}

const home = read("index.html");
assertIndexableDocument(home, `${site}/`, "homepage");
for (const type of ["Organization", "WebSite"]) {
  if (!home.includes(`"@type": "${type}"`)) fail(`homepage: missing ${type} structured data`);
}
if (!home.includes('name="google-site-verification"')) fail("homepage: missing Search Console verification");
if (!home.includes('name="google-adsense-account"')) fail("homepage: missing AdSense account declaration");

const sitemapIndex = read("sitemap.xml");
const shardNames = [...sitemapIndex.matchAll(/<loc>[^<]*\/(sitemap-\d+\.xml)<\/loc>/g)].map((match) => match[1]);
if (!shardNames.length) fail("sitemap index has no shards");
const urls = shardNames.flatMap((name) => [...read(name).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]));
if (!urls.length) fail("sitemap shards have no URLs");
if (new Set(urls).size !== urls.length) fail("sitemap contains duplicate URLs");
for (const url of urls) {
  if (!url.startsWith(`${site}/`)) fail(`off-domain sitemap URL: ${url}`);
  if (/[?#]/.test(url)) fail(`non-canonical query or fragment URL in sitemap: ${url}`);
  if (/\/(?:admin|auth|dashboard|onboarding)(?:\/|$)/.test(url)) fail(`private URL in sitemap: ${url}`);
}

const legalSlugs = ["privacy-policy", "cookie-policy", "terms-of-service", "disclaimer", "editorial-corrections"];
for (const slug of legalSlugs) {
  const canonical = `${site}/legal/${slug}`;
  if (!urls.includes(canonical)) fail(`sitemap missing ${canonical}`);
  assertIndexableDocument(read(`__sarkari_legal_${slug}.asset`), canonical, `legal/${slug}`);
}

const robots = read("robots.txt");
for (const required of ["Googlebot", "Bingbot", "OAI-SearchBot", "ChatGPT-User", "Claude-User", "Claude-SearchBot", "PerplexityBot", `${site}/sitemap.xml`]) {
  if (!robots.includes(required)) fail(`robots.txt missing ${required}`);
}
for (const name of ["llms.txt", "llms-full.txt"]) {
  const text = read(name);
  if (!text.includes(site) || !text.includes("official")) fail(`${name} lacks canonical or source guidance`);
}

const headers = read("_headers");
if (!/\/news\/tag\/\*[\s\S]*?X-Robots-Tag: noindex, nofollow, noarchive/.test(headers)) {
  fail("thin tag archives are not protected by X-Robots-Tag");
}
if (!/\/__sarkari_legal_\*[\s\S]*?X-Robots-Tag: noindex, nofollow, noarchive/.test(headers)) {
  fail("internal legal artifacts are not protected from indexing");
}

console.log(`[discovery] ${urls.length} canonical sitemap URLs and ${legalSlugs.length} prerendered legal pages verified`);
