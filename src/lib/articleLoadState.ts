export type ArticleLoadState = "loading" | "ready" | "not-found" | "unavailable";

export function getArticleLoadState(hasArticle: boolean, isLoading: boolean, isError: boolean): ArticleLoadState {
  if (hasArticle) return "ready";
  if (isLoading) return "loading";
  if (isError) return "unavailable";
  return "not-found";
}
