import { Link } from "react-router-dom";
import { SarkariFooter } from "@/components/sarkari/SarkariFooter";
import { SarkariHeader } from "@/components/sarkari/SarkariHeader";
import { SARKARI_LEGAL_CONTENT } from "@/content/sarkariLegalContent";
import { useSEO } from "@/hooks/useSEO";
import { SITE_CONFIG } from "@/lib/constant";
import {
  getSarkariLegalJsonLd,
  getSarkariLegalPage,
  SARKARI_LEGAL_LAST_UPDATED,
  SARKARI_LEGAL_LAST_UPDATED_ISO,
  SARKARI_LEGAL_PAGES,
  type SarkariLegalSlug,
} from "@/lib/sarkariLegal";

type SarkariLegalPageProps = {
  slug: SarkariLegalSlug;
};

export default function SarkariLegalPage({ slug }: SarkariLegalPageProps) {
  const page = getSarkariLegalPage(slug);

  useSEO({
    title: `${page.title} | Sarkari DekhoCampus`,
    description: page.description,
    canonical: page.path,
    ogImage: SITE_CONFIG.ogImagePath,
    ogImageAlt: "Sarkari DekhoCampus DC logo",
    twitterCard: "summary",
    jsonLd: getSarkariLegalJsonLd(page),
  });

  return (
    <div className="sarkari-site">
      <a className="sarkari-skip-link" href="#content">Skip to main content</a>
      <SarkariHeader />
      <main className="sarkari-detail-main" id="content">
        <div className="sarkari-detail-shell">
          <article className="sarkari-detail-article sarkari-job-article">
            <header className="sarkari-detail-hero sarkari-job-header">
              <nav aria-label="Breadcrumb" className="mb-3 text-sm text-slate-600">
                <Link className="font-semibold text-primary hover:underline" to="/">Home</Link>
                <span aria-hidden="true"> / </span>
                <span>Legal</span>
              </nav>
              <h1>{page.title}</h1>
              <div className="sarkari-detail-meta sarkari-job-meta" aria-label="Policy information">
                <span>
                  <strong className="sarkari-job-meta-label">Last updated:</strong>{" "}
                  <time dateTime={SARKARI_LEGAL_LAST_UPDATED_ISO}>{SARKARI_LEGAL_LAST_UPDATED}</time>
                </span>
              </div>
              <p className="sarkari-detail-excerpt sarkari-job-excerpt">{page.description}</p>
            </header>

            <nav
              aria-label="Legal policies"
              className="my-5 flex flex-wrap gap-2 border-y border-slate-200 py-4"
            >
              {SARKARI_LEGAL_PAGES.map((legalPage) => (
                <Link
                  key={legalPage.slug}
                  to={legalPage.path}
                  aria-current={legalPage.slug === slug ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-md border px-3 py-2 text-sm font-semibold no-underline ${
                    legalPage.slug === slug
                      ? "border-primary bg-primary text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-primary hover:text-primary"
                  }`}
                >
                  {legalPage.shortTitle}
                </Link>
              ))}
            </nav>

            <section className="sarkari-content-card sarkari-job-content" aria-label={page.title}>
              <div className="article-prose article-prose--news max-w-none">
                {SARKARI_LEGAL_CONTENT[slug]}
              </div>
            </section>
          </article>
        </div>
      </main>
      <SarkariFooter />
    </div>
  );
}
