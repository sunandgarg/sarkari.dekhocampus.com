#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

const root = resolve(import.meta.dirname, "..");
const index = readFileSync(resolve(root, "dist/index.html"), "utf8");
const articleShellPath = resolve(root, "dist/__sarkari_article_shell.asset");
const articleShell = readFileSync(articleShellPath, "utf8");
const version = JSON.parse(readFileSync(resolve(root, "dist/version.json"), "utf8"));
const startMarker = "<!-- SARKARI_HOME_PRERENDER_START -->";
const endMarker = "<!-- SARKARI_HOME_PRERENDER_END -->";
const criticalStartMarker = "<!-- SARKARI_HOME_CRITICAL_CSS_START -->";
const criticalEndMarker = "<!-- SARKARI_HOME_CRITICAL_CSS_END -->";

function count(value, token) {
  return value.split(token).length - 1;
}

function requireContract(condition, message) {
  if (!condition) throw new Error(`Homepage prerender check failed: ${message}`);
}

requireContract(count(index, startMarker) === 1 && count(index, endMarker) === 1, "sentinels must occur exactly once");
const prerender = index.slice(index.indexOf(startMarker), index.indexOf(endMarker) + endMarker.length);
requireContract(prerender.includes('<div id="root" data-sarkari-prerender="home">') && prerender.includes('<div class="sarkari-site">'), "hydration root is missing");
requireContract(prerender.includes('class="sarkari-header"'), "real header is missing");
requireContract(prerender.includes('class="sarkari-hero"'), "real hero is missing");
requireContract(prerender.includes('<h1>Your shortcut to <em>government opportunities</em></h1>'), "real hero heading is missing");
requireContract(prerender.includes('class="sarkari-search"'), "real search form is missing");
requireContract(prerender.includes("Loading latest updates..."), "deterministic initial query state is missing");
requireContract(prerender.includes('class="sarkari-footer"'), "real footer is missing");
requireContract(Number.isInteger(version.buildYear) && prerender.includes(`Copyright © <!-- -->${version.buildYear}<!-- -->`), "footer does not use the client build year");
requireContract(!index.includes("sarkari-home-prerender-placeholder"), "placeholder leaked into the build");
requireContract(!index.includes("dc-first-paint-shell"), "legacy imitation shell remains");
requireContract(!index.includes("/src/assets/") && !articleShell.includes("/src/assets/"), "development-only asset URL leaked into a production shell");
for (const logoPath of [
  "/brand/dc-logo.webp",
  "/brand/dekhocampus-wordmark.webp",
  "/brand/dekhocampus-footer-wordmark.webp",
]) {
  requireContract(prerender.includes(logoPath), `homepage prerender is missing ${logoPath}`);
  requireContract(existsSync(resolve(root, "dist", logoPath.slice(1))), `built logo asset is missing ${logoPath}`);
}
requireContract(count(index, "<main") === 1 && count(index, "<h1") === 1, "no-JavaScript homepage must have one main and one h1");
requireContract(!/<noscript\b[^>]*>\s*<main/i.test(index), "generic noscript duplicates the real SSR homepage");
requireContract(!prerender.includes('data-testid="cookie-consent-bar"'), "cookie UI mounted during SSR");
requireContract(!prerender.includes("adsbygoogle") && !prerender.includes("adsense-custom"), "advertising integration mounted during SSR");
requireContract(index.includes('window.location.pathname === "/" && window.location.search === ""'), "exact-route pre-paint guard is missing");
requireContract(/<script\b(?=[^>]*\btype=["']module["'])[^>]*>/i.test(index), "client module is missing");

requireContract(count(index, criticalStartMarker) === 1 && count(index, criticalEndMarker) === 1, "critical CSS sentinels must occur exactly once");
const criticalRegion = index.slice(index.indexOf(criticalStartMarker), index.indexOf(criticalEndMarker) + criticalEndMarker.length);
requireContract(index.indexOf(criticalStartMarker) < index.indexOf("</head>"), "critical CSS gate must be in the document head");
const criticalCss = criticalRegion.match(/<style\b(?=[^>]*\bdata-sarkari-home-critical\b)(?=[^>]*\bmedia=["']not all["'])[^>]*>([\s\S]*?)<\/style>/i)?.[1] || "";
const criticalRawBytes = Buffer.byteLength(criticalCss);
const criticalGzipBytes = gzipSync(criticalCss, { level: 9 }).length;
requireContract(criticalRawBytes >= 8_000 && criticalRawBytes <= 24 * 1024, `critical CSS raw size is ${criticalRawBytes} bytes`);
requireContract(criticalGzipBytes >= 1_500 && criticalGzipBytes <= 6 * 1024, `critical CSS gzip size is ${criticalGzipBytes} bytes`);
for (const selector of [":root", "body", ".sarkari-site", ".sarkari-site :focus-visible", ".sarkari-skip-link:focus", ".sarkari-header", ".sarkari-hero", ".sarkari-hero h1", ".sarkari-search", ".sarkari-loading"]) {
  requireContract(criticalCss.includes(selector), `critical CSS is missing ${selector}`);
}
const deferredStylesheet = criticalRegion.match(/<link\b(?=[^>]*\brel=["']stylesheet["'])(?=[^>]*\bdata-sarkari-full-stylesheet\b)[^>]*>/i)?.[0] || "";
requireContract(/\bmedia=["']print["']/i.test(deferredStylesheet), "exact-home full stylesheet is not initially non-blocking");
requireContract(/\bblocking=["']render["']/i.test(deferredStylesheet), "non-home render-blocking fallback is missing");
const stylesheetHref = deferredStylesheet.match(/\bhref=["'](\/assets\/[^"']+\.css)["']/i)?.[1] || "";
requireContract(Boolean(stylesheetHref), "full external stylesheet URL is missing");
requireContract(criticalRegion.includes("full.media = \"all\""), "full stylesheet promotion is missing");
requireContract(criticalRegion.includes('full.removeAttribute("blocking")'), "exact-home render-block removal is missing");
requireContract(criticalRegion.includes('full.addEventListener("load"'), "event-listener promotion is missing");
requireContract(!/\bonload\s*=/i.test(index), "inline onload attributes violate the CSP contract");
const noScriptStylesheet = criticalRegion.match(/<noscript\b(?=[^>]*\bdata-sarkari-full-css-fallback\b)[^>]*>\s*(<link\b(?=[^>]*\brel=["']stylesheet["'])[^>]*>)\s*<\/noscript>/i)?.[1] || "";
requireContract(Boolean(noScriptStylesheet) && !/\b(?:media|blocking|onload)\s*=/i.test(noScriptStylesheet), "no-JavaScript blocking stylesheet fallback is invalid");
requireContract(noScriptStylesheet.includes(`href="${stylesheetHref}"`), "stylesheet fallbacks do not share one hashed asset");
requireContract(count(index, "<noscript") === 1, "homepage must have exactly one no-JavaScript stylesheet fallback");
const fullCssPath = resolve(root, "dist", stylesheetHref.slice(1));
requireContract(statSync(fullCssPath).size > criticalRawBytes, "critical CSS did not reduce the full stylesheet");

requireContract(articleShell.includes('<div id="root"></div>'), "article shell root is not empty");
requireContract(count(articleShell, "<noscript") === 1, "article shell must retain one crawlable fallback slot");
requireContract(!articleShell.includes(startMarker) && !articleShell.includes(endMarker), "article shell contains homepage sentinels");
requireContract(!articleShell.includes(criticalStartMarker) && !articleShell.includes(criticalEndMarker), "article shell contains the homepage CSS gate");
requireContract(!articleShell.includes("data-sarkari-home-critical") && !articleShell.includes("data-sarkari-full-stylesheet"), "article shell contains exact-home-only CSS state");
requireContract(!articleShell.includes('class="sarkari-site"') && !articleShell.includes("government opportunities"), "article shell leaks homepage content");
requireContract(/<script\b(?=[^>]*\btype=["']module["'])[^>]*>/i.test(articleShell), "article shell client module is missing");
const articleStylesheets = articleShell.match(/<link\b(?=[^>]*\brel=["']stylesheet["'])[^>]*>/gi) || [];
requireContract(articleStylesheets.length === 1 && !/\b(?:media|blocking|onload)\s*=/i.test(articleStylesheets[0]), "article shell full stylesheet is not ordinarily render-blocking");
requireContract(statSync(articleShellPath).size < 20_000, "article shell unexpectedly exceeds 20 KB");

console.log(`Homepage prerender check passed: ${Buffer.byteLength(prerender)} byte SSR region; ${criticalRawBytes}/${criticalGzipBytes} byte critical CSS; ${statSync(articleShellPath).size} byte article shell.`);
