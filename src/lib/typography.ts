const LARGE_DASHES = /[\u2013\u2014]/g;
const CONTAINS_LARGE_DASH = /[\u2013\u2014]/;

/** Convert en/em dashes to the only separator allowed in DekhoCampus content. */
export function normalizeDashes(value: string): string {
  return value.replace(LARGE_DASHES, "-");
}

/** Recursively normalize editorial payloads before they cross an API boundary. */
export function normalizeDashesDeep<T>(value: T): T {
  if (typeof value === "string") return normalizeDashes(value) as T;
  if (Array.isArray(value)) return value.map(normalizeDashesDeep) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeDashesDeep(entry)]),
    ) as T;
  }
  return value;
}

/** Normalize a JSON request body without changing non-JSON request formats. */
export function normalizeJsonRequestBody(body: BodyInit | null | undefined): BodyInit | null | undefined {
  if (typeof body !== "string" || !CONTAINS_LARGE_DASH.test(body)) return body;
  try {
    return JSON.stringify(normalizeDashesDeep(JSON.parse(body)));
  } catch {
    return normalizeDashes(body);
  }
}
