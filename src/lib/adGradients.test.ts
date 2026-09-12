import { describe, expect, it } from "vitest";
import {
  AD_GRADIENT_CLASSES,
  AD_GRADIENT_OPTIONS,
  DEFAULT_AD_GRADIENT,
  normalizeAdGradient,
} from "./adGradients";

describe("public ad gradient contract", () => {
  it("keeps every admin option explicit and safelistable", () => {
    expect(AD_GRADIENT_OPTIONS).toHaveLength(10);
    expect(new Set(AD_GRADIENT_OPTIONS.map(({ value }) => value)).size).toBe(10);
    expect(AD_GRADIENT_CLASSES).toHaveLength(20);
    expect(AD_GRADIENT_CLASSES).toContain("from-violet-600");
    expect(AD_GRADIENT_CLASSES).toContain("to-slate-900");
  });

  it("fails safely to a branded gradient for unknown database values", () => {
    expect(normalizeAdGradient(" from-teal-500   to-emerald-500 ")).toBe("from-teal-500 to-emerald-500");
    expect(normalizeAdGradient("from-unknown-500 to-black")).toBe(DEFAULT_AD_GRADIENT);
    expect(normalizeAdGradient(undefined)).toBe(DEFAULT_AD_GRADIENT);
  });
});
