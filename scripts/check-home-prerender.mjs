#!/usr/bin/env node

import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const index = readFileSync(resolve(root, "dist/index.html"), "utf8");
const articleShellPath = resolve(root, "dist/__sarkari_article_shell.asset");
const articleShell = readFileSync(articleShellPath, "utf8");
const version = JSON.parse(readFileSync(resolve(root, "dist/version.json"), "utf8"));
const startMarker = "<!-- SARKARI_HOME_PRERENDER_START -->";
const endMarker = "<!-- SARKARI_HOME_PRERENDER_END -->";

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
requireContract(count(index, "<main") === 1 && count(index, "<h1") === 1, "no-JavaScript homepage must have one main and one h1");
requireContract(!/<noscript\b/i.test(index), "generic noscript duplicates the real SSR homepage");
requireContract(!prerender.includes('data-testid="cookie-consent-bar"'), "cookie UI mounted during SSR");
requireContract(!prerender.includes("adsbygoogle") && !prerender.includes("adsense-custom"), "advertising integration mounted during SSR");
requireContract(index.includes('window.location.pathname === "/" && window.location.search === ""'), "exact-route pre-paint guard is missing");
requireContract(/<script\b(?=[^>]*\btype=["']module["'])[^>]*>/i.test(index), "client module is missing");
const stylesheet = index.match(/<link\b(?=[^>]*\brel=["']stylesheet["'])[^>]*>/i)?.[0] || "";
requireContract(Boolean(stylesheet) && !/\bmedia=["'](?:print|not all)["']/i.test(stylesheet), "full stylesheet must remain render-blocking");

requireContract(articleShell.includes('<div id="root"></div>'), "article shell root is not empty");
requireContract(count(articleShell, "<noscript") === 1, "article shell must retain one crawlable fallback slot");
requireContract(!articleShell.includes(startMarker) && !articleShell.includes(endMarker), "article shell contains homepage sentinels");
requireContract(!articleShell.includes('class="sarkari-site"') && !articleShell.includes("government opportunities"), "article shell leaks homepage content");
requireContract(/<script\b(?=[^>]*\btype=["']module["'])[^>]*>/i.test(articleShell), "article shell client module is missing");
requireContract(statSync(articleShellPath).size < 20_000, "article shell unexpectedly exceeds 20 KB");

console.log(`Homepage prerender check passed: ${Buffer.byteLength(prerender)} byte SSR region; ${statSync(articleShellPath).size} byte article shell.`);
