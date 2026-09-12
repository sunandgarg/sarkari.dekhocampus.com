import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("public Sarkari release boundaries", () => {
  const appSource = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
  const indexSource = readFileSync(resolve(process.cwd(), "src/pages/Index.tsx"), "utf8");
  const articleSource = readFileSync(resolve(process.cwd(), "src/pages/ArticleDetail.tsx"), "utf8");
  const hookSource = readFileSync(resolve(process.cwd(), "src/hooks/useArticlesData.ts"), "utf8");

  it("does not expose a duplicate authentication or admin application", () => {
    expect(appSource).not.toMatch(/path="\/auth"|path="\/admin/);
    expect(appSource).not.toMatch(/pages\/Auth|pages\/Admin/);
  });

  it("does not publish hardcoded demo notices as runtime fallbacks", () => {
    expect(indexSource).not.toMatch(/sarkariArticles/);
    expect(articleSource).not.toMatch(/sarkariArticles|staticArticles|staticArticle/);
  });

  it("bounds public lists and selects only explicit display fields", () => {
    expect(hookSource).toMatch(/PUBLIC_ARTICLE_DETAIL_FIELDS/);
    expect(hookSource).toMatch(/\.eq\("site_scope", SARKARI_SITE_SCOPE\)/);
    expect(hookSource).toMatch(/\.eq\("status", "Published"\)/);
    expect(hookSource).toMatch(/\.eq\("is_active", true\)/);
    expect(hookSource).toMatch(/\.limit\(SARKARI_ARCHIVE_PAGE_SIZE\)/);
  });

  it("keeps notification and tooltip libraries out of the homepage entry path", () => {
    expect(appSource).not.toContain('from "@/components/ui/toaster"');
    expect(appSource).not.toContain('from "@/components/ui/sonner"');
    expect(appSource).not.toContain('from "@/components/ui/tooltip"');
    expect(hookSource).not.toMatch(/^import .* from "sonner";/m);
    expect(hookSource).toContain('void import("sonner")');
    expect(articleSource).toContain('import { Toaster as Sonner } from "@/components/ui/sonner"');
  });
});
