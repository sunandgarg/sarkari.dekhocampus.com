import { describe, expect, it } from "vitest";
import {
  containsBlockedPublicSource,
  isBlockedPublicSourceUrl,
  stripVisibleArticleSources,
  stripVisibleSourceBrands,
} from "@/lib/articleContentSanitizer";

describe("article source-brand sanitizer", () => {
  it.each([
    "GovtJobGuru.in",
    "Govt Job Guru",
    "govt-job-guru.in",
    "SarkariResult.com",
    "Sarkari Result",
    "sarkari-result.com",
  ])("removes an inline discovery-source credit for %s", (brand) => {
    const output = stripVisibleArticleSources([
      "<p>Authority-verified recruitment details.</p>",
      `<p>Originally discovered via <a href=\"https://${brand.toLowerCase()}\">${brand}</a>.</p>`,
      "<p><a href=\"https://upsc.gov.in/\">Official authority website</a></p>",
    ].join(""));

    expect(output).toContain("Authority-verified recruitment details");
    expect(output).toContain("https://upsc.gov.in/");
    expect(output.toLowerCase()).not.toContain(brand.toLowerCase());
  });

  it("cleans names and domains from short public and SEO fields", () => {
    const title = stripVisibleSourceBrands("Railway Clerk 2026 via Sarkari Result");
    const description = stripVisibleSourceBrands("Details: https://www.govt-job-guru.in/jobs/railway");

    expect(title).toBe("Railway Clerk 2026");
    expect(description).toBe("Details");
    expect(containsBlockedPublicSource(title)).toBe(false);
    expect(containsBlockedPublicSource(description)).toBe(false);
    expect(isBlockedPublicSourceUrl("https://sarkariresult.com/image.webp")).toBe(true);
    expect(isBlockedPublicSourceUrl("https://upsc.gov.in/notice.pdf")).toBe(false);
  });

  it("preserves legitimate Hindi education and teacher wording", () => {
    expect(stripVisibleSourceBrands("Rajasthan Shiksha Vibhag Recruitment 2026"))
      .toBe("Rajasthan Shiksha Vibhag Recruitment 2026");
    expect(stripVisibleSourceBrands("UP Shikshak Bharti 2026"))
      .toBe("UP Shikshak Bharti 2026");
    expect(stripVisibleSourceBrands("Vacancies via Shiksha"))
      .toBe("Vacancies");
    expect(stripVisibleSourceBrands("Read https://www.shiksha.com/jobs"))
      .toBe("Read");
  });
});
