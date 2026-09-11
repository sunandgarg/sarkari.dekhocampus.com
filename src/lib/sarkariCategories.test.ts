import { describe, expect, it } from "vitest";
import { isSarkariCategory, normalizeSarkariCategory, SARKARI_CATEGORIES } from "./sarkariCategories";

describe("Sarkari category contract", () => {
  it("keeps the seven public sections canonical and unique", () => {
    expect(SARKARI_CATEGORIES).toEqual([
      "Latest Jobs",
      "Results",
      "Admit Card",
      "Answer Key",
      "Admissions",
      "Syllabus",
      "Scholarships",
    ]);
    expect(new Set(SARKARI_CATEGORIES).size).toBe(SARKARI_CATEGORIES.length);
  });

  it("normalizes common editorial aliases into the public taxonomy", () => {
    expect(normalizeSarkariCategory("Recruitment Notification")).toBe("Latest Jobs");
    expect(normalizeSarkariCategory("Hall Ticket")).toBe("Admit Card");
    expect(normalizeSarkariCategory("Counselling")).toBe("Admissions");
    expect(normalizeSarkariCategory("Scholarship")).toBe("Scholarships");
    expect(isSarkariCategory("Railways")).toBe(false);
  });
});
