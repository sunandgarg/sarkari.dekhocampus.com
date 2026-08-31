export function isMissingExploreSelectionColumn(error: { message?: string } | null | undefined) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("show_in_explore_by_category")
    || message.includes("explore_by_category_checked_at");
}
