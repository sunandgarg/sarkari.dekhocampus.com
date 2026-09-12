export const HOME_PRERENDER_ATTRIBUTE = "data-sarkari-prerender";
export const HOME_PRERENDER_VALUE = "home";
export const HOME_PRERENDER_START = "<!-- SARKARI_HOME_PRERENDER_START -->";
export const HOME_PRERENDER_END = "<!-- SARKARI_HOME_PRERENDER_END -->";
export const HOME_PRERENDER_PLACEHOLDER = '<div id="sarkari-home-prerender-placeholder"></div>';
// Use a non-.html suffix so Cloudflare Clean URLs cannot canonicalize an
// internal rewrite target to an extensionless 308 response.
export const ARTICLE_SHELL_PATH = "/__sarkari_article_shell.asset";
export const HOME_PRERENDER_IDENTIFIER_PREFIX = "sarkari-home-";

type LocationLike = { pathname: string; search: string };

export function isExactHomeLocation(location: LocationLike) {
  return location.pathname === "/" && location.search === "";
}

export function hasHydratableHomePrerender(root: HTMLElement, location: LocationLike) {
  return isExactHomeLocation(location)
    && root.getAttribute(HOME_PRERENDER_ATTRIBUTE) === HOME_PRERENDER_VALUE
    && root.childElementCount === 1
    && root.firstElementChild?.classList.contains("sarkari-site") === true;
}

/**
 * Remove the build-time homepage tree before an article shell is returned.
 * Sentinels live outside #root so this never relies on parsing nested divs.
 */
export function stripHomePrerenderFromHtml(html: string) {
  const start = html.indexOf(HOME_PRERENDER_START);
  const end = html.indexOf(HOME_PRERENDER_END);
  if (start === -1 && end === -1) return html;

  const duplicateStart = start >= 0 && html.indexOf(HOME_PRERENDER_START, start + HOME_PRERENDER_START.length) >= 0;
  const duplicateEnd = end >= 0 && html.indexOf(HOME_PRERENDER_END, end + HOME_PRERENDER_END.length) >= 0;
  if (start < 0 || end < start || duplicateStart || duplicateEnd) {
    throw new Error("Malformed Sarkari homepage prerender sentinels");
  }

  return `${html.slice(0, start)}<div id="root"></div>${html.slice(end + HOME_PRERENDER_END.length)}`;
}
