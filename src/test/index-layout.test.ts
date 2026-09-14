import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("Sarkari homepage layout (static source assertions)", () => {
  const indexSrc = readFileSync(resolve(process.cwd(), "src/pages/Index.tsx"), "utf8");
  const headerSrc = readFileSync(resolve(process.cwd(), "src/components/sarkari/SarkariHeader.tsx"), "utf8");
  const footerSrc = readFileSync(resolve(process.cwd(), "src/components/sarkari/SarkariFooter.tsx"), "utf8");
  const configSrc = readFileSync(resolve(process.cwd(), "src/lib/constant.ts"), "utf8");
  const stylesSrc = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");
  const denseStyles = stylesSrc.slice(stylesSrc.indexOf("/* Dense public jobs portal presentation."));

  it("uses the official full wordmark in the header at every viewport", () => {
    expect(configSrc).toContain('compactLogoPath: "/brand/dc-logo.webp"');
    expect(configSrc).toContain('wordmarkPath: "/brand/dekhocampus-wordmark.webp"');
    expect(configSrc).toContain('footerWordmarkPath: "/brand/dekhocampus-footer-wordmark.webp"');
    expect(headerSrc).not.toContain("<source");
    expect(headerSrc).toContain('<img src={SITE_CONFIG.wordmarkPath} alt="" width="256" height="70"');
    expect(headerSrc).toContain('aria-label="Sarkari DekhoCampus home"');
    expect(headerSrc).not.toContain('className="sarkari-emblem"');
    expect(headerSrc).not.toMatch(/>SD</);
    expect(indexSrc).toContain('<img src={SITE_CONFIG.compactLogoPath} alt="" width="128" height="123" aria-hidden="true" />');
    expect(footerSrc).toContain('<img src={SITE_CONFIG.footerWordmarkPath} alt="DekhoCampus" width="308" height="102"');
    expect(denseStyles).toMatch(/@media \(max-width: 900px\)[\s\S]*\.sarkari-brand-picture \{ width: min\(142px, 37vw\); aspect-ratio: 256 \/ 70; \}/);
  });

  it("provides search, trending updates and all primary update boards", () => {
    expect(indexSrc).toMatch(/Search exam, department, post or notification/);
    expect(indexSrc).toMatch(/Trending Govt Jobs/);
    expect(indexSrc).toMatch(/SARKARI_CATEGORIES\.map/);
    expect(indexSrc).toMatch(/Latest Govt Jobs \$\{buildYear\}/);
    expect(indexSrc).toContain('typeof __APP_BUILD_YEAR__ === "number"');
    expect(indexSrc).toMatch(/Latest Results/);
    expect(indexSrc).toMatch(/Latest Admit Cards/);
    expect(indexSrc).toMatch(/Latest Answer Keys/);
  });

  it("supports the discovery paths users expect from a government-job portal", () => {
    expect(indexSrc).toMatch(/Government jobs by position/);
    expect(indexSrc).toMatch(/Government jobs by qualification/);
    expect(indexSrc).toMatch(/Government jobs by department/);
    expect(indexSrc).toMatch(/Government jobs by state/);
    expect(headerSrc).toMatch(/Walk-in/);
    expect(indexSrc).toMatch(/directoryItemIcons/);
    expect(indexSrc).toMatch(/stateCodes/);
  });

  it("renders bounded compact grids without carousels or hidden directory entries", () => {
    expect(indexSrc).toMatch(/SARKARI_ARCHIVE_PAGE_SIZE/);
    expect(indexSrc).toMatch(/TRENDING_ITEM_LIMIT = 8/);
    expect(indexSrc).toContain("hasFilters ? SARKARI_ARCHIVE_PAGE_SIZE : UPDATE_ITEM_LIMIT");
    expect(indexSrc).toMatch(/className="sarkari-trending-grid sarkari-dense-trending-grid"/);
    expect(stylesSrc).toMatch(/\.sarkari-dense-card-label \{ display: none !important; \}/);
    expect(indexSrc).toMatch(/className="sarkari-update-grid sarkari-dense-update-grid"/);
    expect(indexSrc).toMatch(/className="sarkari-update-number"/);
    expect(indexSrc).toMatch(/className="sarkari-browse-grid"/);
    expect(indexSrc).not.toMatch(/SarkariCarousel|expandedDirectories|Show all|Show less/);
  });

  it("uses concise update language and accessible orientation", () => {
    expect(indexSrc).toMatch(/View More/);
    expect(indexSrc).toMatch(/Published <time dateTime=\{article\.createdAt\}>/);
    expect(indexSrc).toMatch(/aria-labelledby={`sarkari-update-heading-\$\{groupIndex\}`}/);
    expect(indexSrc).toMatch(/<ol className="sarkari-update-grid sarkari-dense-update-grid"/);
    expect(indexSrc).toMatch(/Skip to main content/);
    expect(indexSrc).toMatch(/aria-live="polite"/);
    expect(headerSrc).toMatch(/aria-current/);
  });

  it("gives the primary search field stable form and label semantics", () => {
    expect(indexSrc).toMatch(/<form[^>]*role="search"[^>]*aria-label="Search Sarkari updates"/);
    expect(indexSrc).toMatch(/<label[^>]*htmlFor="sarkari-home-search"[^>]*>Search Sarkari updates<\/label>/);
    expect(indexSrc).toMatch(/<input id="sarkari-home-search" name="q" type="search"/);
  });

  it("protects focus, readable targets and reduced-motion preferences", () => {
    expect(stylesSrc).toMatch(/:focus-visible/);
    expect(stylesSrc).toMatch(/prefers-reduced-motion/);
    expect(indexSrc).toMatch(/className="sarkari-browse-card"/);
    expect(indexSrc).toMatch(/className="sarkari-trending-card sarkari-dense-trending-card"/);
    expect(indexSrc).toMatch(/className="sarkari-update-card sarkari-dense-update-card"/);
    expect(stylesSrc).toMatch(/@media \(max-width: 900px\)[\s\S]*\.sarkari-menu-button \{ display: grid; \}/);
    expect(stylesSrc).toMatch(/\.sarkari-nav-bar nav a \{[\s\S]*white-space: nowrap;/);
    expect(denseStyles).toMatch(/@media \(prefers-reduced-motion: no-preference\)[\s\S]*sarkari-soft-enter/);
    expect(denseStyles).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none !important;/);
  });

  it("adds restrained semantic highlights without changing dense geometry", () => {
    expect(denseStyles).toMatch(/--sarkari-motion-ui: 180ms/);
    expect(denseStyles).toMatch(/\.sarkari-search:focus-within/);
    expect(denseStyles).toMatch(/\.sarkari-trending-card::before/);
    expect(denseStyles).toMatch(/\.sarkari-dense-new-label \{[\s\S]*display: inline-flex;/);
    expect(denseStyles).toMatch(/@media \(hover: hover\) and \(pointer: fine\)/);
    expect(denseStyles).not.toMatch(/animation:\s*(?:pulse|bounce|marquee|shimmer)/);
  });

  it("keeps the active dense layout centered and fully structured", () => {
    expect(denseStyles).toMatch(/\.sarkari-main \{[\s\S]*margin: 0 auto;/);
    expect(denseStyles).toMatch(/\.sarkari-update-sections \{ display: grid; gap: 24px; \}/);
    expect(denseStyles).toMatch(/\.sarkari-directory-item-label \{[\s\S]*display: flex;[\s\S]*align-items: center;/);
    expect(denseStyles).toMatch(/\.sarkari-filter-summary \{[\s\S]*display: flex;[\s\S]*padding: 13px 15px;/);
    expect(denseStyles).toMatch(/\.sarkari-archive-pagination \{[\s\S]*display: grid;[\s\S]*grid-template-columns:/);
    expect(denseStyles).toMatch(/@media \(max-width: 480px\)[\s\S]*\.sarkari-alert-cta \{[^}]*flex-direction: column;/);
  });

  it("connects directory entries to search and article results", () => {
    expect(indexSrc).toMatch(/to={`\/\?q=\$\{encodeURIComponent\(item\)\}`}/);
    expect(indexSrc).toMatch(/to={`\/news\/\$\{article\.slug\}`}/);
    expect(indexSrc).toMatch(/VITE_ALERT_CHANNEL_URL/);
  });

  it("does not publish unsupported vacancy or trust counters", () => {
    expect(indexSrc).not.toMatch(/\b(?:10,000|50,000|1,00,000|1M\+)\b/);
    expect(indexSrc).not.toMatch(/verified vacancies|students placed|success rate/i);
  });
});
