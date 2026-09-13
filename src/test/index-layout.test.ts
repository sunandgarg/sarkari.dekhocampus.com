import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("Sarkari homepage layout (static source assertions)", () => {
  const indexSrc = readFileSync(resolve(process.cwd(), "src/pages/Index.tsx"), "utf8");
  const headerSrc = readFileSync(resolve(process.cwd(), "src/components/sarkari/SarkariHeader.tsx"), "utf8");
  const footerSrc = readFileSync(resolve(process.cwd(), "src/components/sarkari/SarkariFooter.tsx"), "utf8");
  const configSrc = readFileSync(resolve(process.cwd(), "src/lib/constant.ts"), "utf8");
  const stylesSrc = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");

  it("uses the official full wordmark and compact DC mark in their intended contexts", () => {
    expect(configSrc).toContain('compactLogoPath: "/brand/dc-logo.webp"');
    expect(configSrc).toContain('wordmarkPath: "/brand/dekhocampus-wordmark.webp"');
    expect(configSrc).toContain('footerWordmarkPath: "/brand/dekhocampus-footer-wordmark.webp"');
    expect(headerSrc).toContain('<source media="(max-width: 560px)" srcSet={SITE_CONFIG.compactLogoPath} />');
    expect(headerSrc).toContain('<img src={SITE_CONFIG.wordmarkPath} alt="" width="256" height="70"');
    expect(headerSrc).toContain('aria-label="Sarkari DekhoCampus home"');
    expect(headerSrc).not.toContain('className="sarkari-emblem"');
    expect(headerSrc).not.toMatch(/>SD</);
    expect(indexSrc).toContain('<img src={SITE_CONFIG.compactLogoPath} alt="" width="128" height="123" aria-hidden="true" />');
    expect(footerSrc).toContain('<img src={SITE_CONFIG.footerWordmarkPath} alt="DekhoCampus" width="308" height="102"');
    expect(stylesSrc).toMatch(/@media \(max-width: 560px\)[\s\S]*\.sarkari-brand-picture \{ width: 34px; aspect-ratio: 64 \/ 62; \}/);
  });

  it("provides search, trust guidance, alerts and all primary update boards", () => {
    expect(indexSrc).toMatch(/Search exam, department, post or notification/);
    expect(indexSrc).toMatch(/Official links first/);
    expect(indexSrc).toMatch(/Latest alerts/);
    expect(indexSrc).toMatch(/SARKARI_CATEGORIES\.map/);
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

  it("limits dense sections with progressive disclosure and reusable carousels", () => {
    expect(indexSrc).toMatch(/SarkariCarousel/);
    expect(indexSrc).toMatch(/SARKARI_ARCHIVE_PAGE_SIZE/);
    expect(indexSrc).toMatch(/expandedDirectories/);
    expect(stylesSrc).toMatch(/\.sarkari-carousel-track[^}]*grid-template-rows:\s*repeat\(2, auto\)/);
    expect(stylesSrc).toMatch(/\.sarkari-carousel-track[^}]*grid-auto-columns:\s*calc\(\(100% - 24px\) \/ 3\)/);
    expect(stylesSrc).toMatch(/\.sarkari-directory:not\(\.is-expanded\)/);
  });

  it("uses recognition-first action language and accessible orientation", () => {
    expect(indexSrc).toMatch(/Find a job/);
    expect(indexSrc).toMatch(/Check a result/);
    expect(indexSrc).toMatch(/Get an admit card/);
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
    expect(stylesSrc).toMatch(/\.sarkari-category-dock a[^}]*min-height:\s*86px/);
    expect(stylesSrc).toMatch(/\.sarkari-board li a[^}]*font-size:\s*13px/);
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
