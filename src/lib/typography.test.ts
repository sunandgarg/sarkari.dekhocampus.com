import { describe, expect, it } from "vitest";
import { normalizeDashes, normalizeDashesDeep, normalizeJsonRequestBody } from "./typography";

describe("dash normalization", () => {
  it("converts em and en dashes to a regular hyphen", () => {
    expect(normalizeDashes("Admissions \u2014 Courses \u2013 Fees")).toBe("Admissions - Courses - Fees");
  });

  it("normalizes nested editorial payloads", () => {
    expect(normalizeDashesDeep({
      title: "College \u2014 2026",
      sections: ["Courses \u2013 Fees", { note: "Official \u2014 source" }],
      count: 2,
    })).toEqual({
      title: "College - 2026",
      sections: ["Courses - Fees", { note: "Official - source" }],
      count: 2,
    });
  });

  it("normalizes JSON request bodies before writes", () => {
    const result = normalizeJsonRequestBody(JSON.stringify({
      content: "Apply \u2014 verify",
      nested: ["2026\u201327"],
    }));
    expect(JSON.parse(String(result))).toEqual({
      content: "Apply - verify",
      nested: ["2026-27"],
    });
  });
});
