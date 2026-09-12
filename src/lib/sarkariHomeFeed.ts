import { SARKARI_CATEGORIES, type SarkariCategory } from "./sarkariCategories";

export const SARKARI_HOME_FEED_VERSION = 1 as const;
export const SARKARI_HOME_FEED_MAX_ITEMS = 9;
export const SARKARI_HOME_FEED_MAX_BYTES = 256 * 1024;

export type SarkariHomeFeedCard = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: SarkariCategory;
  createdAt: string;
};

export type SarkariHomeFeed = {
  version: typeof SARKARI_HOME_FEED_VERSION;
  latest: SarkariHomeFeedCard[];
  byCategory: Record<SarkariCategory, SarkariHomeFeedCard[]>;
};

const encoder = new TextEncoder();
const cardKeys = ["category", "createdAt", "description", "id", "slug", "title"];
const feedKeys = ["byCategory", "latest", "version"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const keys = Object.keys(value).sort();
  return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
}

function boundedString(value: unknown, maximumBytes: number, required = false) {
  if (typeof value !== "string") return undefined;
  if ((required && !value.trim()) || encoder.encode(value).byteLength > maximumBytes) return undefined;
  return value;
}

function parseCard(value: unknown, expectedCategory?: SarkariCategory): SarkariHomeFeedCard | undefined {
  if (!isRecord(value) || !hasExactKeys(value, cardKeys)) return undefined;
  const id = boundedString(value.id, 64, true);
  const slug = boundedString(value.slug, 180, true);
  const title = boundedString(value.title, 240, true);
  const description = boundedString(value.description, 800);
  const category = value.category;
  const createdAt = boundedString(value.createdAt, 40, true);
  if (!id || !slug || !title || description === undefined || !createdAt) return undefined;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return undefined;
  if (!(SARKARI_CATEGORIES as readonly unknown[]).includes(category)) return undefined;
  if (expectedCategory && category !== expectedCategory) return undefined;
  const parsedDate = new Date(createdAt);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString() !== createdAt) return undefined;
  return { id, slug, title, description, category: category as SarkariCategory, createdAt };
}

function parseCardList(value: unknown, expectedCategory?: SarkariCategory) {
  if (!Array.isArray(value) || value.length > SARKARI_HOME_FEED_MAX_ITEMS) return undefined;
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const cards: SarkariHomeFeedCard[] = [];
  for (const item of value) {
    const card = parseCard(item, expectedCategory);
    if (!card || ids.has(card.id) || slugs.has(card.slug)) return undefined;
    ids.add(card.id);
    slugs.add(card.slug);
    cards.push(card);
  }
  return cards;
}

/**
 * The AWS response is a public but untrusted boundary. Reject schema drift,
 * extra fields and partial rails instead of letting malformed data reach the
 * homepage or a shared edge cache.
 */
export function parseSarkariHomeFeed(value: unknown): SarkariHomeFeed | undefined {
  if (!isRecord(value) || !hasExactKeys(value, feedKeys) || value.version !== SARKARI_HOME_FEED_VERSION) return undefined;
  if (!isRecord(value.byCategory) || !hasExactKeys(value.byCategory, [...SARKARI_CATEGORIES].sort())) return undefined;
  const latest = parseCardList(value.latest);
  if (!latest) return undefined;
  const byCategory = {} as Record<SarkariCategory, SarkariHomeFeedCard[]>;
  for (const category of SARKARI_CATEGORIES) {
    const cards = parseCardList(value.byCategory[category], category);
    if (!cards) return undefined;
    byCategory[category] = cards;
  }
  const feed = { version: SARKARI_HOME_FEED_VERSION, latest, byCategory };
  if (encoder.encode(JSON.stringify(feed)).byteLength > SARKARI_HOME_FEED_MAX_BYTES) return undefined;
  return feed;
}

export async function readBoundedSarkariHomeFeed(response: Response) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > SARKARI_HOME_FEED_MAX_BYTES) {
    await response.body?.cancel("SARKARI_HOME_FEED_TOO_LARGE").catch(() => undefined);
    throw new Error("SARKARI_HOME_FEED_TOO_LARGE");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    if (encoder.encode(text).byteLength > SARKARI_HOME_FEED_MAX_BYTES) throw new Error("SARKARI_HOME_FEED_TOO_LARGE");
    const parsed = parseSarkariHomeFeed(JSON.parse(text));
    if (!parsed) throw new Error("SARKARI_HOME_FEED_INVALID");
    return parsed;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > SARKARI_HOME_FEED_MAX_BYTES) {
        await reader.cancel("SARKARI_HOME_FEED_TOO_LARGE").catch(() => undefined);
        throw new Error("SARKARI_HOME_FEED_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const parsed = parseSarkariHomeFeed(JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes)));
  if (!parsed) throw new Error("SARKARI_HOME_FEED_INVALID");
  return parsed;
}
