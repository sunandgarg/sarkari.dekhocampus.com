import {
  SARKARI_ARTICLE_BOOTSTRAP_ID,
  parseSarkariArticleBootstrap,
  type PublicSarkariArticle,
} from "./sarkariArticleBootstrap";

/** Browser-only DOM adapter kept separate from the shared Worker-safe contract. */
export function readSarkariArticleBootstrap(expectedSlug: string): PublicSarkariArticle | undefined {
  if (typeof document === "undefined" || typeof window === "undefined") return undefined;
  const node = document.getElementById(SARKARI_ARTICLE_BOOTSTRAP_ID);
  if (!node || node.getAttribute("type") !== "application/json") return undefined;
  return parseSarkariArticleBootstrap(node.textContent || "", expectedSlug, window.location.pathname);
}
