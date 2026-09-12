import {
  readBoundedSarkariHomeFeed,
  type SarkariHomeFeed,
} from "../../src/lib/sarkariHomeFeed";

const DEFAULT_API_URL = "https://aws-origin.dekhocampus.com";
const ORIGIN_PATH = "/v1/functions/sarkari-home-feed";
const CACHE_KEY = "https://sarkari-internal.invalid/home-feed?schema=1";
const SOFT_TTL_MS = 60_000;
const HARD_TTL_MS = 300_000;
const BROWSER_TTL_SECONDS = 30;
const ORIGIN_TIMEOUT_MS = 4_000;
const STORED_AT_HEADER = "x-sarkari-feed-stored-at";

type PagesContext = {
  request: Request;
  env: { API_URL?: string };
  waitUntil(promise: Promise<unknown>): void;
};

type EdgeStage =
  | "cache_read"
  | "cache_shape"
  | "cache_write"
  | "origin_config"
  | "origin_network"
  | "origin_status"
  | "origin_payload";

class EdgeFeedError extends Error {
  constructor(readonly stage: EdgeStage, readonly status?: number) {
    super(stage);
  }
}

type CachedFeed = { feed: SarkariHomeFeed; ageMs: number };

function logEdgeProblem(stage: EdgeStage, status?: number) {
  console.warn(JSON.stringify({ event: "sarkari_home_feed_edge_error", stage, ...(status ? { status } : {}) }));
}

function defaultCache() {
  return (globalThis as typeof globalThis & { caches?: { default?: Cache } }).caches?.default;
}

function originUrl(rawBase: string | undefined) {
  try {
    const url = new URL(ORIGIN_PATH, `${String(rawBase || DEFAULT_API_URL).replace(/\/$/, "")}/`);
    if (url.protocol !== "https:") throw new Error("protocol");
    return url.toString();
  } catch {
    throw new EdgeFeedError("origin_config");
  }
}

async function fetchOriginFeed(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ORIGIN_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new EdgeFeedError("origin_status", response.status);
    try {
      return await readBoundedSarkariHomeFeed(response);
    } catch (error) {
      if (error instanceof EdgeFeedError) throw error;
      throw new EdgeFeedError("origin_payload");
    }
  } catch (error) {
    if (error instanceof EdgeFeedError) throw error;
    throw new EdgeFeedError("origin_network");
  } finally {
    clearTimeout(timer);
  }
}

async function readCachedFeed(cache: Cache, now: number): Promise<CachedFeed | undefined> {
  let response: Response | undefined;
  try {
    response = await cache.match(new Request(CACHE_KEY)) || undefined;
  } catch {
    throw new EdgeFeedError("cache_read");
  }
  if (!response) return undefined;
  const storedAt = Number(response.headers.get(STORED_AT_HEADER));
  if (!response.ok || !Number.isFinite(storedAt) || storedAt <= 0 || storedAt > now) {
    throw new EdgeFeedError("cache_shape");
  }
  try {
    return { feed: await readBoundedSarkariHomeFeed(response), ageMs: now - storedAt };
  } catch {
    throw new EdgeFeedError("cache_shape");
  }
}

async function storeFeed(cache: Cache, feed: SarkariHomeFeed, now: number) {
  const response = new Response(JSON.stringify(feed), {
    status: 200,
    headers: {
      "cache-control": `public, max-age=${Math.floor(HARD_TTL_MS / 1000)}`,
      "content-type": "application/json; charset=utf-8",
      [STORED_AT_HEADER]: String(now),
      "x-content-type-options": "nosniff",
    },
  });
  try {
    await cache.put(new Request(CACHE_KEY), response);
  } catch {
    throw new EdgeFeedError("cache_write");
  }
}

function feedResponse(feed: SarkariHomeFeed, method: string, cacheStatus: "HIT" | "MISS" | "STALE" | "BYPASS", ageMs = 0) {
  return new Response(method === "HEAD" ? null : JSON.stringify(feed), {
    status: 200,
    headers: {
      "cache-control": `public, max-age=${BROWSER_TTL_SECONDS}, must-revalidate`,
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      "x-sarkari-feed-age": String(Math.max(0, Math.floor(ageMs / 1000))),
      "x-sarkari-feed-cache": cacheStatus,
    },
  });
}

function errorResponse(method: string, status: number, code: string, message: string, extraHeaders: Record<string, string> = {}) {
  return new Response(method === "HEAD" ? null : JSON.stringify({ code, message }), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      ...extraHeaders,
    },
  });
}

async function refreshAndStore(cache: Cache, url: string) {
  try {
    const feed = await fetchOriginFeed(url);
    await storeFeed(cache, feed, Date.now());
  } catch (error) {
    const problem = error instanceof EdgeFeedError ? error : new EdgeFeedError("origin_network");
    logEdgeProblem(problem.stage, problem.status);
  }
}

export async function onRequest(context: PagesContext) {
  const method = context.request.method.toUpperCase();
  if (!["GET", "HEAD"].includes(method)) {
    return errorResponse(method, 405, "METHOD_NOT_ALLOWED", "Use GET or HEAD for the Sarkari homepage feed.", {
      allow: "GET, HEAD",
    });
  }
  const requestUrl = new URL(context.request.url);
  if (requestUrl.search || context.request.url.endsWith("?")) {
    return errorResponse(method, 400, "QUERY_NOT_ALLOWED", "The Sarkari homepage feed does not accept query parameters.");
  }

  let url: string;
  try {
    url = originUrl(context.env.API_URL);
  } catch (error) {
    const problem = error as EdgeFeedError;
    logEdgeProblem(problem.stage);
    return errorResponse(method, 503, "SARKARI_HOME_FEED_UNAVAILABLE", "Government updates are temporarily unavailable.", {
      "retry-after": "2",
      "x-sarkari-feed-cache": "BYPASS",
    });
  }

  const cache = defaultCache();
  let cacheOperational = Boolean(cache);
  let cached: CachedFeed | undefined;
  if (cache) {
    try {
      cached = await readCachedFeed(cache, Date.now());
    } catch (error) {
      cacheOperational = false;
      const problem = error as EdgeFeedError;
      logEdgeProblem(problem.stage);
    }
  }

  if (cached && cached.ageMs <= SOFT_TTL_MS) return feedResponse(cached.feed, method, "HIT", cached.ageMs);
  if (cached && cached.ageMs <= HARD_TTL_MS && cache) {
    context.waitUntil(refreshAndStore(cache, url));
    return feedResponse(cached.feed, method, "STALE", cached.ageMs);
  }

  try {
    const feed = await fetchOriginFeed(url);
    if (cacheOperational && cache) {
      try {
        await storeFeed(cache, feed, Date.now());
      } catch (error) {
        cacheOperational = false;
        const problem = error as EdgeFeedError;
        logEdgeProblem(problem.stage);
      }
    }
    return feedResponse(feed, method, cacheOperational ? "MISS" : "BYPASS");
  } catch (error) {
    const problem = error instanceof EdgeFeedError ? error : new EdgeFeedError("origin_network");
    logEdgeProblem(problem.stage, problem.status);
    return errorResponse(method, 503, "SARKARI_HOME_FEED_UNAVAILABLE", "Government updates are temporarily unavailable.", {
      "retry-after": "2",
      "x-sarkari-feed-cache": cacheOperational ? "MISS" : "BYPASS",
    });
  }
}

export const homeFeedEdgeInternals = {
  CACHE_KEY,
  HARD_TTL_MS,
  SOFT_TTL_MS,
};
