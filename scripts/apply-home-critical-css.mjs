#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import postcss from "postcss";
import { JSDOM } from "jsdom";

const projectRoot = resolve(import.meta.dirname, "..");
const indexPath = resolve(projectRoot, "dist/index.html");
const startMarker = "<!-- SARKARI_HOME_CRITICAL_CSS_START -->";
const endMarker = "<!-- SARKARI_HOME_CRITICAL_CSS_END -->";
const maxRawBytes = 24 * 1024;
const maxGzipBytes = 6 * 1024;
const interactiveState = /(?<!\\):(?:hover|active|visited)\b/i;
const focusState = /(?<!\\):(?:focus-visible|focus-within|focus)\b/gi;
const pseudoElement = /(?<!\\)::[a-z-]+(?:\([^)]*\))?/gi;
const legacyPseudoElement = /(?<!\\):(?:before|after|first-letter|first-line)\b/gi;
const groupingAtRules = new Set(["media", "supports", "container"]);

function count(value, token) {
  return value.split(token).length - 1;
}

function fail(message) {
  throw new Error(`Homepage critical CSS generation failed: ${message}`);
}

const html = readFileSync(indexPath, "utf8");
if (count(html, startMarker) || count(html, endMarker)) {
  fail("output already contains a critical CSS region");
}

const stylesheetTags = html.match(/<link\b(?=[^>]*\brel=["']stylesheet["'])[^>]*>/gi) || [];
if (stylesheetTags.length !== 1) fail(`expected one compiled stylesheet, found ${stylesheetTags.length}`);
const blockingStylesheet = stylesheetTags[0];
if (/\b(?:media|blocking|onload)\s*=/i.test(blockingStylesheet)) {
  fail("compiled stylesheet is not an ordinary blocking link");
}
const href = blockingStylesheet.match(/\bhref=["'](\/assets\/[^"']+\.css)["']/i)?.[1];
if (!href) fail("compiled stylesheet must be a same-origin hashed CSS asset");

const cssPath = resolve(projectRoot, "dist", href.slice(1));
const fullCss = readFileSync(cssPath, "utf8");
if (!fullCss.trim() || /<\/style/i.test(fullCss)) fail("compiled stylesheet is empty or unsafe to inline");

const dom = new JSDOM(html);
const document = dom.window.document;
const renderedClasses = new Set(
  Array.from(document.querySelectorAll("[class]"), (element) => Array.from(element.classList)).flat(),
);
const renderedIds = new Set(Array.from(document.querySelectorAll("[id]"), (element) => element.id));
const invalidSelectors = [];

function couldTargetRenderedMarkup(selector) {
  return Array.from(renderedClasses).some((className) => selector.includes(`.${className}`))
    || Array.from(renderedIds).some((id) => selector.includes(`#${id}`));
}

function selectorMatchesPrerender(selector) {
  // Pointer interaction-only rules are not part of the first paint. Keyboard
  // focus rules remain in the subset: the skip link and visible outline must
  // still work while the full sheet is pending or unavailable.
  if (interactiveState.test(selector)) return false;
  const query = selector
    .replace(pseudoElement, "")
    .replace(legacyPseudoElement, "")
    .replace(focusState, "")
    .trim();
  if (!query) return selector === ":before" || selector === ":after";
  try {
    return document.querySelector(query) !== null;
  } catch (error) {
    if (couldTargetRenderedMarkup(selector)) {
      fail(`cannot safely evaluate rendered selector ${JSON.stringify(selector)}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
    invalidSelectors.push(selector);
    return false;
  }
}

const parsed = postcss.parse(fullCss, { from: cssPath });
const critical = postcss.root();
const keyframes = new Map();

parsed.walkAtRules(/keyframes$/i, (rule) => {
  keyframes.set(rule.params, rule);
});

function copyMatchingRules(source, target) {
  for (const node of source.nodes || []) {
    if (node.type === "rule") {
      const selectors = node.selectors.filter(selectorMatchesPrerender);
      if (!selectors.length) continue;
      const clone = node.clone();
      clone.selectors = selectors;
      target.append(clone);
      continue;
    }
    if (node.type === "comment") continue;
    if (node.type !== "atrule") fail(`unsupported ${node.type} node in compiled CSS`);
    if (/keyframes$/i.test(node.name)) continue;
    // Keep rare global registration rules fail-closed. The current compiled
    // sheet has none; future additions still remain subject to the size caps.
    if (node.name === "property" || node.name === "font-face") {
      target.append(node.clone());
      continue;
    }
    if (node.nodes) {
      if (!groupingAtRules.has(node.name)) fail(`unsupported @${node.name} block in compiled CSS`);
      if (node.nodes.some((child) => child.type === "decl")) {
        fail(`unsupported direct declaration inside @${node.name}`);
      }
      const clone = node.clone({ nodes: [] });
      copyMatchingRules(node, clone);
      if (clone.nodes.length) target.append(clone);
      continue;
    }
    // Inline critical CSS cannot safely preserve ordering/import statements
    // such as @layer a,b, @import, or @charset. Fail the build so a future
    // stylesheet change receives an explicit extraction policy.
    fail(`unsupported statement @${node.name} ${node.params}`.trim());
  }
}

copyMatchingRules(parsed, critical);

// Include only keyframes referenced by declarations that survived extraction.
// Names come from the parsed stylesheet itself, avoiding shorthand guesswork.
const referencedKeyframes = new Set();
critical.walkDecls((declaration) => {
  for (const name of keyframes.keys()) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|[^a-zA-Z0-9_-])${escaped}([^a-zA-Z0-9_-]|$)`).test(declaration.value)) {
      referencedKeyframes.add(name);
    }
  }
});
for (const name of referencedKeyframes) critical.append(keyframes.get(name).clone());

const criticalCss = critical.toString();
const rawBytes = Buffer.byteLength(criticalCss);
const gzipBytes = gzipSync(criticalCss, { level: 9 }).length;
if (rawBytes > maxRawBytes || gzipBytes > maxGzipBytes) {
  fail(`subset is ${rawBytes} raw/${gzipBytes} gzip bytes; caps are ${maxRawBytes}/${maxGzipBytes}`);
}
if (rawBytes < 8_000 || gzipBytes < 1_500) fail("subset is unexpectedly small");
for (const selector of [":root", "body", ".sarkari-site", ".sarkari-site :focus-visible", ".sarkari-skip-link:focus", ".sarkari-header", ".sarkari-hero", ".sarkari-hero h1", ".sarkari-search", ".sarkari-loading"]) {
  if (!criticalCss.includes(selector)) fail(`required first-paint selector ${selector} is missing`);
}

const deferredStylesheet = blockingStylesheet.replace(
  /\s*\/?>$/,
  ' data-sarkari-full-stylesheet media="print" blocking="render">',
);
const gate = `${startMarker}
<style data-sarkari-home-critical media="not all">${criticalCss}</style>
${deferredStylesheet}
<script data-sarkari-home-css-gate>
  (() => {
    const critical = document.querySelector("style[data-sarkari-home-critical]");
    const full = document.querySelector("link[data-sarkari-full-stylesheet]");
    if (!critical || !full) return;
    const exactHome = window.location.pathname === "/" && window.location.search === "";
    if (!exactHome) {
      full.media = "all";
      return;
    }
    critical.media = "all";
    full.removeAttribute("blocking");
    const promoteFullStylesheet = () => {
      full.media = "all";
      critical.media = "not all";
      document.documentElement.setAttribute("data-sarkari-full-css", "ready");
    };
    if (full.sheet) promoteFullStylesheet();
    else full.addEventListener("load", promoteFullStylesheet, { once: true });
  })();
</script>
<noscript data-sarkari-full-css-fallback>${blockingStylesheet}</noscript>
${endMarker}`;

const output = html.replace(blockingStylesheet, gate);
if (output === html || count(output, startMarker) !== 1 || count(output, endMarker) !== 1) {
  fail("could not inject one critical CSS region");
}
writeFileSync(indexPath, output);
console.log(`[home-critical-css] ${rawBytes} raw/${gzipBytes} gzip bytes; ${invalidSelectors.length} irrelevant unsupported selectors skipped`);
