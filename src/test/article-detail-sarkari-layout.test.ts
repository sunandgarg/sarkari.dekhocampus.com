import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("Sarkari article detail layout (static source assertions)", () => {
  const articleSrc = readFileSync(resolve(process.cwd(), "src/pages/ArticleDetail.tsx"), "utf8");
  const articleHookSrc = readFileSync(resolve(process.cwd(), "src/hooks/useArticlesData.ts"), "utf8");
  const stylesSrc = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");

  it("keeps quick decisions compact and moves optional lead capture after the article", () => {
    expect(articleSrc).toMatch(/sarkari-next-step-grid/);
    expect(articleSrc).toMatch(/sarkari-detail-alert-optin/);
    expect(articleSrc).toMatch(/sarkari_article_after_content_/);
    expect(articleSrc).not.toMatch(/className="sarkari-detail-lead"/);
    expect((articleSrc.match(/<LeadCaptureForm/g) || [])).toHaveLength(1);
    expect(stylesSrc).toMatch(/\.sarkari-next-step-grid\s*\{\s*grid-template-columns:\s*repeat\(2/);
  });

  it("shows up to nine category-prioritised recommendations in the carousel", () => {
    expect(articleSrc).toMatch(/SarkariCarousel/);
    expect(articleSrc).toMatch(/useRelatedSarkariArticles/);
    expect(articleHookSrc).toMatch(/article\.category === category \? 10 : 0/);
    expect(articleHookSrc).toMatch(/slice\(0, SARKARI_ARCHIVE_PAGE_SIZE\)/);
    expect(articleSrc).toMatch(/sarkari-related-card/);
  });

  it("keeps bookmarks functional without a public authentication route", () => {
    expect(articleSrc).toMatch(/sarkari_saved_articles_v1/);
    expect(articleSrc).not.toMatch(/useAuth|\/auth\?redirect/);
  });

  it("never falls back to hardcoded demo notices", () => {
    expect(articleSrc).not.toMatch(/sarkariArticles|staticArticles|staticArticle/);
  });
});
