export function compactEntityLabel(value: string | null | undefined, maxWords = 3) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxWords)
    .join(" ");
}
