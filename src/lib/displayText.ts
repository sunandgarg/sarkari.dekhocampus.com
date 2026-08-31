const ENTITY_KEY_RE = /^(cat_)?(id|slug|uuid|created_at|updated_at)$/i;

function decodeEntities(input: string) {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function titleCaseKey(key: string) {
  return key.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function bestObjectLabel(value: Record<string, unknown>) {
  const preferred = [
    "Cat_name", "cat_name", "category_name", "name", "title", "label", "value",
    "full_name", "short_name", "course_name", "exam_name", "college_name",
  ];
  for (const key of preferred) {
    const candidate = value[key];
    if (typeof candidate === "string" || typeof candidate === "number") {
      const text = displayText(candidate);
      if (text) return text;
    }
  }
  const firstUseful = Object.entries(value).find(([key, item]) =>
    !ENTITY_KEY_RE.test(key) && (typeof item === "string" || typeof item === "number")
  );
  if (!firstUseful) return "";
  const [key, item] = firstUseful;
  const text = displayText(item);
  return text || titleCaseKey(key);
}

function parseJsonish(input: string): unknown {
  const trimmed = input.trim();
  if (!/^[\[{]/.test(trimmed)) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    try {
      return JSON.parse(trimmed.replace(/'/g, '"'));
    } catch {
      return undefined;
    }
  }
}

export function stripMarkup(value: unknown) {
  return decodeEntities(String(value ?? ""))
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function displayText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  if (Array.isArray(value)) {
    const joined = value.map((item) => displayText(item)).filter(Boolean).join(", ");
    return joined || fallback;
  }
  if (typeof value === "object") {
    const label = bestObjectLabel(value as Record<string, unknown>);
    return label || fallback;
  }
  const raw = String(value).trim();
  if (!raw || raw === "-" || raw === "[]" || raw === "{}") return fallback;
  const parsed = parseJsonish(raw);
  if (parsed !== undefined) return displayText(parsed, fallback);
  const stripped = stripMarkup(raw);
  return stripped || fallback;
}

export function compactDisplayText(value: unknown, fallback = "-", max = 120) {
  const text = displayText(value, fallback);
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}...`;
}
