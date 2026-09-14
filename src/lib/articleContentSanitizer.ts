const VISIBLE_SOURCE_LABEL =
  "(?:sources?|references?|citations?|bibliography|source\\s+links?|credits?)";

const decodeSourceName = (codes: readonly number[]) => codes
  .map((code) => String.fromCharCode(code))
  .join("");

const BLOCKED_SOURCE_NAME_CODES = [
  [103, 111, 118, 116, 106, 111, 98, 103, 117, 114, 117],
  [115, 97, 114, 107, 97, 114, 105, 114, 101, 115, 117, 108, 116],
] as const;

const COMPETITOR_TERMS = [
  "collegedekho",
  "college dekho",
  "collegedunia",
  "college dunia",
  "careers360",
  "careers 360",
  "kollegeapply",
  "kollege apply",
  "getmyuni",
  "pagalguy",
  // Decode these at runtime so public content can be filtered without placing
  // the discovery-source names in the production bundle as searchable text.
  ...BLOCKED_SOURCE_NAME_CODES.map(decodeSourceName),
];

// This source name is also an ordinary Hindi word and the prefix of legitimate
// terms such as "shikshak". Treat it as a source only in an attribution phrase
// or domain, never as an unconditional public-text removal.
const CONTEXTUAL_SOURCE_TERMS = ["shiksha"];

const regexEscape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Match concatenated, spaced, dotted and hyphenated spellings without placing
// discovery-source names in rendered metadata or public article payloads.
const buildNamePattern = (terms: string[]) => terms
  .map((term) => term.replace(/[^a-z0-9]/gi, ""))
  .filter(Boolean)
  .map((term) => term.split("").map(regexEscape).join("[\\s._-]*"))
  .join("|");

const withTokenBoundaries = (pattern: string) => `\\b(?:${pattern})\\b`;
const COMPETITOR_PATTERN = withTokenBoundaries(buildNamePattern(COMPETITOR_TERMS));
const CONTEXTUAL_SOURCE_PATTERN = withTokenBoundaries(buildNamePattern(CONTEXTUAL_SOURCE_TERMS));
const ATTRIBUTION_PATTERN =
  "\\b(?:source(?:d)?(?:\\s+from)?|via|credits?(?:\\s+to)?|according\\s+to|reported\\s+by|references?(?:\\s+to)?)\\s*[:\\-]?\\s*";
const SOURCE_TLD_PATTERN = "(?:com|in|org|net|co\\.in)";
const COMPETITOR_URL_PATTERN =
  `(?:https?:\\/\\/)?(?:www\\.)?(?:${COMPETITOR_PATTERN})(?:\\.${SOURCE_TLD_PATTERN})?(?:\\/[^\\s<>'\"]*)?`;
const CONTEXTUAL_SOURCE_URL_PATTERN =
  `(?:https?:\\/\\/)?(?:www\\.)?(?:${CONTEXTUAL_SOURCE_PATTERN})\\.${SOURCE_TLD_PATTERN}(?:\\/[^\\s<>'\"]*)?`;
const COMPETITOR_REFERENCE_PATTERN =
  `(?:${COMPETITOR_URL_PATTERN}|${CONTEXTUAL_SOURCE_URL_PATTERN}|${ATTRIBUTION_PATTERN}(?:${CONTEXTUAL_SOURCE_PATTERN}))`;

export function containsBlockedPublicSource(value?: string | null) {
  const input = String(value || "");
  return new RegExp(`(?:${COMPETITOR_PATTERN}|${CONTEXTUAL_SOURCE_URL_PATTERN})`, "i").test(input);
}

/**
 * Remove discovery-site names and URLs from short public fields such as
 * titles, descriptions, authors, tags and SEO metadata. Recruiting-authority
 * names and official links are deliberately unaffected.
 */
export function stripVisibleSourceBrands(value?: string | null) {
  let output = String(value || "");
  if (!output.trim()) return "";

  output = output
    .replace(
      new RegExp(`(?:${ATTRIBUTION_PATTERN})?(?:${COMPETITOR_URL_PATTERN})|${CONTEXTUAL_SOURCE_URL_PATTERN}|${ATTRIBUTION_PATTERN}(?:${CONTEXTUAL_SOURCE_PATTERN})`, "gi"),
      " ",
    )
    .replace(/<a\b[^>]*>\s*<\/a>/gi, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/(?:\s*[-|:]\s*)+$/g, "")
    .trim();

  return output;
}

export function isBlockedPublicSourceUrl(value?: string | null) {
  const candidate = String(value || "").trim();
  return Boolean(candidate) && new RegExp(`^(?:${COMPETITOR_URL_PATTERN}|${CONTEXTUAL_SOURCE_URL_PATTERN})$`, "i").test(candidate);
}

export function stripVisibleArticleSources(value?: string | null) {
  let output = String(value || "");
  if (!output.trim()) return "";

  const sourceLabel = VISIBLE_SOURCE_LABEL;
  const competitor = COMPETITOR_REFERENCE_PATTERN;

  // Remove a trailing visible source/credit block in common HTML formats:
  // <h2>Sources</h2>..., <p><strong>Sources</strong><br>..., etc.
  output = output
    .replace(new RegExp(`<h[1-6][^>]*>\\s*(?:<[^>]+>\\s*)*${sourceLabel}(?:\\s*<\\/[^>]+>)*\\s*<\\/h[1-6]>[\\s\\S]*$`, "i"), "")
    .replace(new RegExp(`<p[^>]*>\\s*(?:<strong>|<b>)?\\s*${sourceLabel}\\s*(?:<\\/strong>|<\\/b>)?(?:\\s*<br\\s*\\/?>)?[\\s\\S]*$`, "i"), "")
    .replace(new RegExp(`<div[^>]*>\\s*(?:<strong>|<b>)?\\s*${sourceLabel}\\s*(?:<\\/strong>|<\\/b>)?(?:\\s*<br\\s*\\/?>)?[\\s\\S]*$`, "i"), "");

  // Remove Markdown-style blocks:
  // **Sources**
  // **WBJEEB:** ...
  output = output.replace(new RegExp(`(?:^|\\n)\\s*(?:#{1,6}\\s*)?(?:\\*\\*)?\\s*${sourceLabel}\\s*(?:\\*\\*)?\\s*(?:\\n|<br\\s*\\/?>)[\\s\\S]*$`, "i"), "");

  // If a model wrote competitor credits without a "Sources" heading, remove
  // the affected paragraph/list item instead of exposing the brand.
  output = output
    .replace(new RegExp(`<p[^>]*>(?:(?!<\\/p>)[\\s\\S])*(?:${competitor})(?:(?!<\\/p>)[\\s\\S])*<\\/p>\\s*`, "gi"), "")
    .replace(new RegExp(`<li[^>]*>(?:(?!<\\/li>)[\\s\\S])*(?:${competitor})(?:(?!<\\/li>)[\\s\\S])*<\\/li>\\s*`, "gi"), "")
    .replace(new RegExp(`(?:^|\\n)\\s*(?:[-*]\\s*)?(?:\\*\\*)?[^\\n]*(?:${competitor})[^\\n]*(?:\\*\\*)?\\s*(?=\\n|$)`, "gim"), "");

  return stripVisibleSourceBrands(output);
}
