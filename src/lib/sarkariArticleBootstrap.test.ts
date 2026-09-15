import { describe, expect, it } from "vitest";
import {
  parseSarkariArticleBootstrap,
  serializeSarkariArticleBootstrap,
  validatePublicSarkariArticle,
  type PublicSarkariArticle,
} from "./sarkariArticleBootstrap";

export const bootstrapArticle: PublicSarkariArticle = {
  id: "bootstrap-article-1",
  site_scope: "sarkari",
  status: "Published",
  title: "Railway Clerk 2026",
  slug: "railway-clerk-2026",
  description: "Important dates and eligibility.",
  content: `<p>Safe copy</p></script><script>window.evil=true</script>`,
  vertical: "Government Jobs",
  category: "Latest Jobs",
  author: "Sarkari Desk",
  featured_image: "https://cdn.example.com/railway.webp",
  views: 42,
  tags: ["Railway", "Clerk"],
  meta_title: "Railway Clerk 2026",
  meta_description: "Important dates and eligibility.",
  meta_keywords: "railway,clerk",
  is_active: true,
  featured_rank: 1,
  created_at: "2026-09-12T00:00:00.000Z",
  updated_at: "2026-09-12T01:00:00.000Z",
};

describe("Sarkari article bootstrap contract", () => {
  it("serializes script-breakout text without a literal less-than character", () => {
    const serialized = serializeSarkariArticleBootstrap(bootstrapArticle);
    expect(serialized).not.toContain("<");
    expect(serialized).toContain("\\u003c/script>");
    expect(JSON.parse(serialized).article.content).toBe(bootstrapArticle.content);
  });

  it("accepts only the canonical route and exact public Sarkari tenant", () => {
    const serialized = serializeSarkariArticleBootstrap(bootstrapArticle);
    expect(parseSarkariArticleBootstrap(serialized, bootstrapArticle.slug, `/news/${bootstrapArticle.slug}`)?.id)
      .toBe(bootstrapArticle.id);
    expect(parseSarkariArticleBootstrap(serialized, bootstrapArticle.slug, "/news/a-different-job")).toBeUndefined();
    expect(parseSarkariArticleBootstrap(serialized, "Railway Clerk 2026", `/news/${bootstrapArticle.slug}`)).toBeUndefined();
    expect(validatePublicSarkariArticle({ ...bootstrapArticle, site_scope: "dekhocampus" }, bootstrapArticle.slug)).toBeUndefined();
    expect(validatePublicSarkariArticle({ ...bootstrapArticle, status: "Draft" }, bootstrapArticle.slug)).toBeUndefined();
    expect(validatePublicSarkariArticle({ ...bootstrapArticle, is_active: false }, bootstrapArticle.slug)).toBeUndefined();
  });

  it("accepts case-insensitive published status and numeric active state, then normalizes both", () => {
    const parsed = validatePublicSarkariArticle(
      { ...bootstrapArticle, status: " published ", is_active: 1 },
      bootstrapArticle.slug,
    );
    expect(parsed?.status).toBe("Published");
    expect(parsed?.is_active).toBe(true);
  });

  it("removes discovery-source names from every public text and bootstrap field", () => {
    const contaminated = {
      ...bootstrapArticle,
      title: "Railway Clerk via Sarkari Result",
      description: "Dates from govt-job-guru.in",
      content: "<p>Official details.</p><p>Credit: Govt Job Guru</p>",
      author: "SarkariResult.com",
      tags: ["Railway", "Sarkari Result"],
      meta_title: "Railway Clerk | GovtJobGuru",
      meta_description: "According to sarkari-result.com",
      meta_keywords: "railway, govt job guru",
      featured_image: "https://sarkariresult.com/image.webp",
    };
    const parsed = validatePublicSarkariArticle(contaminated, bootstrapArticle.slug);
    const serialized = serializeSarkariArticleBootstrap(contaminated);
    const publicText = JSON.stringify({ parsed, serialized }).toLowerCase();

    expect(parsed?.title).toBe("Railway Clerk");
    expect(parsed?.author).toBe("Sarkari DekhoCampus Desk");
    expect(parsed?.tags).toEqual(["Railway"]);
    expect(parsed?.featured_image).toBe("");
    expect(publicText).not.toMatch(/sarkari[ ._-]*result|govt[ ._-]*job[ ._-]*guru/);
  });

  it("fails closed for malformed or incomplete payloads", () => {
    expect(parseSarkariArticleBootstrap("not-json", bootstrapArticle.slug, `/news/${bootstrapArticle.slug}`)).toBeUndefined();
    expect(parseSarkariArticleBootstrap(JSON.stringify({ version: 2, article: bootstrapArticle }), bootstrapArticle.slug, `/news/${bootstrapArticle.slug}`)).toBeUndefined();
    expect(validatePublicSarkariArticle({ ...bootstrapArticle, id: "" }, bootstrapArticle.slug)).toBeUndefined();
    expect(validatePublicSarkariArticle({ ...bootstrapArticle, tags: ["x".repeat(201)] }, bootstrapArticle.slug)).toBeUndefined();
    expect(validatePublicSarkariArticle({ ...bootstrapArticle, content: "x".repeat(500_001) }, bootstrapArticle.slug)).toBeUndefined();
    expect(validatePublicSarkariArticle({ ...bootstrapArticle, featured_rank: "1" }, bootstrapArticle.slug)).toBeUndefined();
    const blockedSlug = "railway-clerk-sarkari-result";
    expect(validatePublicSarkariArticle({ ...bootstrapArticle, slug: blockedSlug }, blockedSlug)).toBeUndefined();
    expect(validatePublicSarkariArticle({ ...bootstrapArticle, id: "govt-job-guru-card" }, bootstrapArticle.slug)).toBeUndefined();
  });

  it("keeps the article public but omits invalid optional job metadata", () => {
    const article = validatePublicSarkariArticle({
      ...bootstrapArticle,
      job_posting: { title: "Incomplete record" },
    }, bootstrapArticle.slug);
    expect(article?.id).toBe(bootstrapArticle.id);
    expect(article?.job_posting).toBeUndefined();
  });
});
