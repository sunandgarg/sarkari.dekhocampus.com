import { describe, expect, it } from "vitest";
import {
  getSarkariLegalPage,
  isSarkariLegalPath,
  SARKARI_LEGAL_LAST_UPDATED_ISO,
  SARKARI_LEGAL_PAGES,
} from "./sarkariLegal";

describe("Sarkari legal page registry", () => {
  it("defines five unique canonical legal pages", () => {
    expect(SARKARI_LEGAL_PAGES).toHaveLength(5);
    expect(new Set(SARKARI_LEGAL_PAGES.map((page) => page.slug)).size).toBe(5);
    expect(new Set(SARKARI_LEGAL_PAGES.map((page) => page.path)).size).toBe(5);
    expect(SARKARI_LEGAL_PAGES.every((page) => page.path === `/legal/${page.slug}`)).toBe(true);
  });

  it("looks up every registered page and recognises only its canonical path", () => {
    for (const page of SARKARI_LEGAL_PAGES) {
      expect(getSarkariLegalPage(page.slug)).toBe(page);
      expect(isSarkariLegalPath(page.path)).toBe(true);
      expect(isSarkariLegalPath(`${page.path}/`)).toBe(true);
    }
    expect(isSarkariLegalPath("/legal/refund-policy")).toBe(false);
    expect(isSarkariLegalPath("/legal/privacy-policy/extra")).toBe(false);
  });

  it("publishes a valid machine-readable update date", () => {
    expect(SARKARI_LEGAL_LAST_UPDATED_ISO).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(SARKARI_LEGAL_LAST_UPDATED_ISO))).toBe(false);
  });
});
