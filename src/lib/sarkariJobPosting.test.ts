import { describe, expect, it } from "vitest";
import { buildJobPostingSchema, validatePublicJobPosting } from "./sarkariJobPosting";

const validJob = {
  title: "Anganwadi Worker",
  datePosted: "2026-09-11",
  validThrough: "2026-10-02T23:59:59+05:30",
  hiringOrganization: {
    name: "Child Development Department, Uttar Pradesh",
    sameAs: "https://upanganwadibharti.in/",
  },
  jobLocations: [{ addressCountry: "IN", addressRegion: "Uttar Pradesh", addressLocality: "Gonda" }],
  employmentType: ["FULL_TIME"],
  identifier: { name: "District Programme Officer, Gonda", value: "Gonda-2026-128" },
  totalJobOpenings: 128,
};

describe("verified Sarkari JobPosting metadata", () => {
  it("normalizes a complete India job record and builds Google-compatible JSON-LD", () => {
    const metadata = validatePublicJobPosting(validJob);
    expect(metadata).toEqual(validJob);
    const schema = buildJobPostingSchema({
      canonical: "https://sarkari.dekhocampus.com/news/gonda-anganwadi-worker-recruitment-2026-128-district-posts",
      description: `<h2>Overview</h2><p>${"Women with Intermediate eligibility may apply for the district vacancies. ".repeat(3)}</p>`,
      metadata,
    });
    expect(schema).toMatchObject({
      "@type": "JobPosting",
      title: "Anganwadi Worker",
      employmentType: "FULL_TIME",
      hiringOrganization: { "@type": "Organization", name: "Child Development Department, Uttar Pradesh" },
      jobLocation: [{ "@type": "Place", address: { "@type": "PostalAddress", addressCountry: "IN", addressLocality: "Gonda" } }],
      identifier: { "@type": "PropertyValue", value: "Gonda-2026-128" },
      totalJobOpenings: 128,
    });
  });

  it("fails closed instead of guessing incomplete or malformed facts", () => {
    expect(validatePublicJobPosting({ ...validJob, title: "" })).toBeUndefined();
    expect(validatePublicJobPosting({ ...validJob, validThrough: "2 October" })).toBeUndefined();
    expect(validatePublicJobPosting({ ...validJob, validThrough: "2026-10-02" })?.validThrough).toBe("2026-10-02");
    expect(validatePublicJobPosting({ ...validJob, validThrough: "2026-09-01T00:00:00+05:30" })).toBeUndefined();
    expect(validatePublicJobPosting({ ...validJob, hiringOrganization: { name: "Employer" }, jobLocations: [] })).toBeUndefined();
    expect(validatePublicJobPosting({ ...validJob, employmentType: ["PERMANENT"] })).toBeUndefined();
    expect(validatePublicJobPosting({ ...validJob, directApply: false })).toBeUndefined();
    expect(validatePublicJobPosting({ ...validJob, title: "<b>Anganwadi Worker</b>" })).toBeUndefined();
  });

  it("rejects discovery-source attribution and unsafe URLs", () => {
    expect(validatePublicJobPosting({ ...validJob, title: "Anganwadi via Sarkari Result" })).toBeUndefined();
    expect(validatePublicJobPosting({
      ...validJob,
      hiringOrganization: { ...validJob.hiringOrganization, sameAs: "http://example.com" },
    })).toBeUndefined();
  });

  it("requires a substantial visible description and strips executable markup", () => {
    const metadata = validatePublicJobPosting(validJob);
    expect(buildJobPostingSchema({ canonical: "https://sarkari.dekhocampus.com/news/test", description: "Too short", metadata })).toBeUndefined();
    const schema = buildJobPostingSchema({
      canonical: "https://sarkari.dekhocampus.com/news/test",
      description: `<script>alert(1)</script><p onclick="bad()">${"Verified role details and application instructions. ".repeat(4)}</p>`,
      metadata,
    });
    expect(schema?.description).not.toMatch(/script|onclick|alert\(1\)/i);
  });

  it("accepts exact or ranged INR salary only when the unit is explicit", () => {
    expect(validatePublicJobPosting({
      ...validJob,
      baseSalary: { currency: "INR", value: { value: 31_250, unitText: "MONTH" } },
    })?.baseSalary).toEqual({ currency: "INR", value: { value: 31_250, unitText: "MONTH" } });
    expect(validatePublicJobPosting({
      ...validJob,
      baseSalary: { currency: "INR", value: { minValue: 30_000, maxValue: 40_000, unitText: "MONTH" } },
    })?.baseSalary).toEqual({ currency: "INR", value: { minValue: 30_000, maxValue: 40_000, unitText: "MONTH" } });
    expect(validatePublicJobPosting({
      ...validJob,
      baseSalary: { currency: "INR", value: { value: 31_250 } },
    })).toBeUndefined();
  });
});
