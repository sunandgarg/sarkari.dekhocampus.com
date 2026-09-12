import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { homeFeedEdgeInternals, onRequest } from "../../functions/api/home-feed";
import { SARKARI_CATEGORIES, type SarkariCategory } from "@/lib/sarkariCategories";
import type { SarkariHomeFeed } from "@/lib/sarkariHomeFeed";

const NOW = Date.parse("2026-09-13T12:00:00.000Z");
const STORED_AT_HEADER = "x-sarkari-feed-stored-at";

const card = (category: SarkariCategory, index = 1) => ({
  id: `${category.toLowerCase().replace(/ /g, "-")}-${index}`,
  slug: `${category.toLowerCase().replace(/ /g, "-")}-${index}`,
  title: `${category} update ${index}`,
  description: "Important dates and official instructions.",
  category,
  createdAt: `2026-09-${String(index).padStart(2, "0")}T00:00:00.000Z`,
});

const feed = (suffix = 1): SarkariHomeFeed => ({
  version: 1,
  latest: [card("Latest Jobs", suffix)],
  byCategory: Object.fromEntries(SARKARI_CATEGORIES.map((category) => [category, [card(category, suffix)]])) as SarkariHomeFeed["byCategory"],
});

function storedFeed(value: SarkariHomeFeed, storedAt: number) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      [STORED_AT_HEADER]: String(storedAt),
    },
  });
}

function context(request = new Request("https://sarkari.dekhocampus.com/api/home-feed")) {
  const pending: Promise<unknown>[] = [];
  return {
    pending,
    value: {
      request,
      env: { API_URL: "https://api.example.com" },
      waitUntil: (promise: Promise<unknown>) => pending.push(promise),
    },
  };
}

let previousCaches: unknown;

beforeEach(() => {
  previousCaches = (globalThis as typeof globalThis & { caches?: unknown }).caches;
  vi.spyOn(Date, "now").mockReturnValue(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(globalThis, "caches", { configurable: true, value: previousCaches });
  vi.restoreAllMocks();
});

describe("Sarkari homepage feed Pages Function", () => {
  it("stores a cold miss and never forwards browser credentials to AWS", async () => {
    const cache = { match: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined) };
    Object.defineProperty(globalThis, "caches", { configurable: true, value: { default: cache } });
    const origin = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(feed()), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    const { value } = context(new Request("https://sarkari.dekhocampus.com/api/home-feed", {
      headers: { Authorization: "Bearer secret", Cookie: "session=secret" },
    }));
    const response = await onRequest(value);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-sarkari-feed-cache")).toBe("MISS");
    expect(cache.put).toHaveBeenCalledOnce();
    expect(origin).toHaveBeenCalledOnce();
    expect(origin.mock.calls[0][0]).toBe("https://api.example.com/v1/functions/sarkari-home-feed");
    const init = origin.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).has("authorization")).toBe(false);
    expect(new Headers(init.headers).has("cookie")).toBe(false);
    expect(await response.json()).toEqual(feed());
  });

  it("serves a fresh cache hit without any AWS request", async () => {
    const cache = { match: vi.fn().mockResolvedValue(storedFeed(feed(), NOW - 10_000)), put: vi.fn() };
    Object.defineProperty(globalThis, "caches", { configurable: true, value: { default: cache } });
    const origin = vi.spyOn(globalThis, "fetch");
    const response = await onRequest(context().value);
    expect(response.headers.get("x-sarkari-feed-cache")).toBe("HIT");
    expect(response.headers.get("x-sarkari-feed-age")).toBe("10");
    expect(origin).not.toHaveBeenCalled();
    expect(cache.put).not.toHaveBeenCalled();
    expect((cache.match.mock.calls[0][0] as Request).url).toBe(homeFeedEdgeInternals.CACHE_KEY);
  });

  it("returns stale data immediately and refreshes it in waitUntil", async () => {
    const cache = { match: vi.fn().mockResolvedValue(storedFeed(feed(), NOW - 90_000)), put: vi.fn().mockResolvedValue(undefined) };
    Object.defineProperty(globalThis, "caches", { configurable: true, value: { default: cache } });
    const origin = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(feed(2))));
    const { value, pending } = context();
    const response = await onRequest(value);
    expect(response.headers.get("x-sarkari-feed-cache")).toBe("STALE");
    expect((await response.json()).latest[0].id).toContain("-1");
    expect(pending).toHaveLength(1);
    await Promise.all(pending);
    expect(origin).toHaveBeenCalledOnce();
    expect(cache.put).toHaveBeenCalledOnce();
  });

  it("reports cache failures and serves a validated origin response as BYPASS", async () => {
    const cache = { match: vi.fn().mockRejectedValue(new Error("private cache detail")), put: vi.fn() };
    Object.defineProperty(globalThis, "caches", { configurable: true, value: { default: cache } });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(feed())));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const response = await onRequest(context().value);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-sarkari-feed-cache")).toBe("BYPASS");
    expect(cache.put).not.toHaveBeenCalled();
    expect(warning.mock.calls.flat().join(" ")).toContain('"stage":"cache_read"');
    expect(warning.mock.calls.flat().join(" ")).not.toContain("private cache detail");
  });

  it("labels a cache write failure as BYPASS without hiding valid data", async () => {
    const cache = {
      match: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockRejectedValue(new Error("private cache write detail")),
    };
    Object.defineProperty(globalThis, "caches", { configurable: true, value: { default: cache } });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(feed())));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const response = await onRequest(context().value);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-sarkari-feed-cache")).toBe("BYPASS");
    expect(await response.json()).toEqual(feed());
    expect(warning.mock.calls.flat().join(" ")).toContain('"stage":"cache_write"');
    expect(warning.mock.calls.flat().join(" ")).not.toContain("private cache write detail");
  });

  it("keeps the origin timeout active until the complete response body arrives", async () => {
    vi.useFakeTimers();
    Object.defineProperty(globalThis, "caches", { configurable: true, value: undefined });
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => new Response(new ReadableStream({
      start(controller) {
        init?.signal?.addEventListener("abort", () => controller.error(new Error("aborted stalled body")));
      },
    })));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const responsePromise = onRequest(context().value);
    await vi.advanceTimersByTimeAsync(4_001);
    const response = await responsePromise;
    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("2");
    expect(warning).toHaveBeenCalledOnce();
  });

  it.each([
    ["network", () => Promise.reject(new Error("secret network detail"))],
    ["status", () => Promise.resolve(new Response("private origin body", { status: 500 }))],
    ["shape", () => Promise.resolve(new Response("{}", { status: 200 }))],
    ["oversize", () => Promise.resolve(new Response("{}", { status: 200, headers: { "Content-Length": "262145" } }))],
  ])("fails closed on an origin %s error", async (_label, implementation) => {
    Object.defineProperty(globalThis, "caches", { configurable: true, value: undefined });
    vi.spyOn(globalThis, "fetch").mockImplementation(implementation);
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const response = await onRequest(context().value);
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("retry-after")).toBe("2");
    expect(response.headers.get("x-sarkari-feed-cache")).toBe("BYPASS");
    expect(await response.json()).toEqual({
      code: "SARKARI_HOME_FEED_UNAVAILABLE",
      message: "Government updates are temporarily unavailable.",
    });
    expect(warning).toHaveBeenCalledOnce();
    expect(warning.mock.calls.flat().join(" ")).not.toMatch(/secret|private origin/i);
  });

  it("rejects query variants and unsupported methods before cache or origin work", async () => {
    const cache = { match: vi.fn(), put: vi.fn() };
    Object.defineProperty(globalThis, "caches", { configurable: true, value: { default: cache } });
    const origin = vi.spyOn(globalThis, "fetch");
    const query = await onRequest(context(new Request("https://sarkari.dekhocampus.com/api/home-feed?x=1")).value);
    const post = await onRequest(context(new Request("https://sarkari.dekhocampus.com/api/home-feed", { method: "POST" })).value);
    expect(query.status).toBe(400);
    expect(post.status).toBe(405);
    expect(post.headers.get("allow")).toBe("GET, HEAD");
    expect(cache.match).not.toHaveBeenCalled();
    expect(origin).not.toHaveBeenCalled();
  });

  it("returns a bodyless HEAD response with the same validated cache contract", async () => {
    Object.defineProperty(globalThis, "caches", { configurable: true, value: undefined });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(feed())));
    const response = await onRequest(context(new Request("https://sarkari.dekhocampus.com/api/home-feed", { method: "HEAD" })).value);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-sarkari-feed-cache")).toBe("BYPASS");
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.text()).toBe("");
  });
});
