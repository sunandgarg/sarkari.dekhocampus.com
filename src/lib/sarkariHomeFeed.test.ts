import { describe, expect, it } from "vitest";
import { SARKARI_CATEGORIES, type SarkariCategory } from "./sarkariCategories";
import {
  SARKARI_HOME_FEED_MAX_BYTES,
  parseSarkariHomeFeed,
  readBoundedSarkariHomeFeed,
  type SarkariHomeFeed,
} from "./sarkariHomeFeed";

const card = (category: SarkariCategory, index = 1) => ({
  id: `${category.toLowerCase().replace(/ /g, "-")}-${index}`,
  slug: `${category.toLowerCase().replace(/ /g, "-")}-${index}`,
  title: `${category} update ${index}`,
  description: "Important dates and official instructions.",
  category,
  createdAt: `2026-09-${String(index).padStart(2, "0")}T00:00:00.000Z`,
});

const feed = (): SarkariHomeFeed => ({
  version: 1,
  latest: [card("Latest Jobs")],
  byCategory: Object.fromEntries(
    SARKARI_CATEGORIES.map((category) => [category, [card(category)]])
  ) as SarkariHomeFeed["byCategory"],
});

describe("Sarkari homepage feed boundary", () => {
  it("accepts only the exact versioned seven-rail public contract", () => {
    expect(parseSarkariHomeFeed(feed())).toEqual(feed());
    expect(parseSarkariHomeFeed({ ...feed(), extra: true })).toBeUndefined();
    const missing = feed();
    delete (missing.byCategory as Partial<SarkariHomeFeed["byCategory"]>).Results;
    expect(parseSarkariHomeFeed(missing)).toBeUndefined();
    const wrongRail = feed();
    wrongRail.byCategory.Results = [card("Latest Jobs")];
    expect(parseSarkariHomeFeed(wrongRail)).toBeUndefined();
  });

  it("rejects unsafe identifiers, duplicate cards, invalid dates, and oversized rails", () => {
    for (const mutation of [
      { slug: "Not-Canonical" },
      { slug: "unsafe/path" },
      { slug: "railway-govt-job-guru" },
      { id: "sarkari-result-card" },
      { createdAt: "yesterday" },
      { title: "" },
      { description: null },
      { description: { html: "not a string" } },
    ] as Record<string, unknown>[]) {
      const candidate = feed();
      candidate.latest = [{ ...candidate.latest[0], ...mutation } as typeof candidate.latest[number]];
      expect(parseSarkariHomeFeed(candidate)).toBeUndefined();
    }
    const duplicate = feed();
    duplicate.latest = [duplicate.latest[0], duplicate.latest[0]];
    expect(parseSarkariHomeFeed(duplicate)).toBeUndefined();
    const tooMany = feed();
    tooMany.byCategory.Results = Array.from({ length: 10 }, (_, index) => card("Results", index + 1));
    expect(parseSarkariHomeFeed(tooMany)).toBeUndefined();
  });

  it("bounds the response before parsing declared or streamed payloads", async () => {
    const oversizedDeclared = new Response("{}", {
      headers: { "Content-Length": String(SARKARI_HOME_FEED_MAX_BYTES + 1) },
    });
    await expect(readBoundedSarkariHomeFeed(oversizedDeclared)).rejects.toThrow("SARKARI_HOME_FEED_TOO_LARGE");

    const oversizedStream = new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(SARKARI_HOME_FEED_MAX_BYTES));
        controller.enqueue(new Uint8Array(1));
      },
    }));
    await expect(readBoundedSarkariHomeFeed(oversizedStream)).rejects.toThrow("SARKARI_HOME_FEED_TOO_LARGE");

    const valid = new Response(JSON.stringify(feed()), { headers: { "Content-Type": "application/json" } });
    await expect(readBoundedSarkariHomeFeed(valid)).resolves.toEqual(feed());
  });

  it("removes discovery-source names before cards reach the edge cache or homepage", () => {
    const candidate = feed();
    candidate.latest[0] = {
      ...candidate.latest[0],
      title: "Railway Clerk via Sarkari Result",
      description: "Credit: govt-job-guru.in",
    };
    const parsed = parseSarkariHomeFeed(candidate);
    expect(parsed?.latest[0].title).toBe("Railway Clerk");
    expect(parsed?.latest[0].description).toBe("");
    expect(JSON.stringify(parsed)).not.toMatch(/sarkari[ ._-]*result|govt[ ._-]*job[ ._-]*guru/i);
  });
});
