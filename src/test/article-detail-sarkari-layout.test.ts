import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("Sarkari article detail layout (static source assertions)", () => {
  const articleSrc = readFileSync(resolve(process.cwd(), "src/pages/ArticleDetail.tsx"), "utf8");
  const articleHookSrc = readFileSync(resolve(process.cwd(), "src/hooks/useArticlesData.ts"), "utf8");

  it("renders a flat single-column job page without the former card grid or desktop sidebar", () => {
    expect(articleSrc).toMatch(/sarkari-detail-layout sarkari-job-layout/);
    expect(articleSrc).toMatch(/sarkari-detail-article sarkari-job-article/);
    expect(articleSrc).toMatch(/sarkari-detail-hero sarkari-job-header/);
    expect(articleSrc).toMatch(/sarkari-detail-meta sarkari-job-meta/);
    expect(articleSrc).toMatch(/sarkari-content-card sarkari-job-content/);
    expect(articleSrc).not.toMatch(/sarkari-next-step/);
    expect(articleSrc).not.toMatch(/sarkari-detail-sidebar/);
    expect(articleSrc).not.toMatch(/sarkari-toc-card/);
    expect(articleSrc).not.toMatch(/sarkari-detail-kickers/);
    expect(articleSrc).not.toMatch(/NEWS_CATEGORIES|PageBreadcrumb/);
    expect(articleSrc).not.toMatch(/lg:grid-cols-12|lg:col-span-4|h-\[420px\]/);
  });

  it("keeps article content, metadata and supporting sections intact", () => {
    expect(articleSrc).toMatch(/<SarkariHeader/);
    expect(articleSrc).toMatch(/<SarkariFooter/);
    expect((articleSrc.match(/className="sarkari-skip-link"/g) || [])).toHaveLength(4);
    expect(articleSrc).toMatch(/sarkari-job-meta-label/);
    expect(articleSrc).toMatch(/sarkari-detail-excerpt sarkari-job-excerpt/);
    expect(articleSrc).toMatch(/sarkari-detail-image sarkari-job-image/);
    expect(articleSrc).toMatch(/stripVisibleArticleSources/);
    expect(articleSrc).toMatch(/<RichText/);
    expect(articleSrc).toMatch(/<ReactMarkdown/);
    expect(articleSrc).toMatch(/className="table-wrap" role="region" aria-label="Scrollable article table" tabIndex=\{0\}/);
    expect(articleSrc).toMatch(/<DocumentViewer/);
    expect(articleSrc).toMatch(/sarkari-official-reminder/);
    expect(articleSrc).toMatch(/<ArticleTagCloud/);
    expect(articleSrc).toMatch(/sarkari-detail-alert-optin/);
    expect(articleSrc).toMatch(/sarkari_article_after_content_/);
    expect((articleSrc.match(/<LeadCaptureForm/g) || [])).toHaveLength(1);
    expect(articleSrc).toMatch(/DynamicAdBanner/);
    expect(articleSrc).toMatch(/FAQSection/);
    expect(articleSrc).not.toMatch(/<Link[^>]*>\s*<Button/);
  });

  it("shows category-prioritised recommendations as a dense fixed list", () => {
    expect(articleSrc).toMatch(/useRelatedSarkariArticles/);
    expect(articleHookSrc).toMatch(/article\.category === category \? 10 : 0/);
    expect(articleHookSrc).toMatch(/slice\(0, SARKARI_ARCHIVE_PAGE_SIZE\)/);
    expect(articleSrc).toMatch(/<ol className="sarkari-related-list sarkari-job-related-list"/);
    expect(articleSrc).toMatch(/sarkari-related-card sarkari-job-related-item/);
    expect(articleSrc).not.toMatch(/SarkariCarousel/);
  });

  it("keeps save, listen, share and mobile table-of-contents interactions functional", () => {
    expect(articleSrc).toMatch(/sarkari_saved_articles_v1/);
    expect(articleSrc).toMatch(/onClick=\{handleSave\}/);
    expect(articleSrc).toMatch(/onClick=\{toggleListen\}/);
    expect(articleSrc).toMatch(/onClick=\{handleShare\}/);
    expect(articleSrc).toMatch(/<Sheet open=\{tocSheetOpen\}/);
    expect(articleSrc).not.toMatch(/useAuth|\/auth\?redirect/);
  });

  it("never falls back to hardcoded demo notices", () => {
    expect(articleSrc).not.toMatch(/sarkariArticles|staticArticles|staticArticle/);
  });
});
