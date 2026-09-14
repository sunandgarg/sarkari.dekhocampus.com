import { ArrowRight, Award, BellRing, BookOpenCheck, BriefcaseBusiness, Building2, Calculator, CalendarDays, ChevronRight, ClipboardList, GraduationCap, Hammer, HeartPulse, Keyboard, Landmark, Mail, MapPin, School, Search, Shield, Siren, Stethoscope, TrainFront, UserRoundSearch, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { SarkariCarousel } from "@/components/sarkari/SarkariCarousel";
import { SarkariFooter } from "@/components/sarkari/SarkariFooter";
import { SarkariHeader } from "@/components/sarkari/SarkariHeader";
import { SarkariAdSlot } from "@/components/sarkari/SarkariAdSlot";
import { SARKARI_ARCHIVE_PAGE_SIZE, usePublicArticleArchive, useSarkariHomepageArticles, type DbArticle } from "@/hooks/useArticlesData";
import { isSarkariCategory, normalizeSarkariCategory, SARKARI_CATEGORIES } from "@/lib/sarkariCategories";
import { SITE_CONFIG } from "@/lib/constant";

declare const __APP_BUILD_YEAR__: number;

const buildYear =
  typeof __APP_BUILD_YEAR__ === "number"
    ? __APP_BUILD_YEAR__
    : new Date().getFullYear();

type PortalArticle = {
  slug: string;
  title: string;
  description: string;
  category: string;
  createdAt: string;
  isNew?: boolean;
};

const directoryItemIcons: Record<string, LucideIcon> = {
  Apprentice: Hammer,
  Teacher: School,
  Clerk: ClipboardList,
  Engineer: Wrench,
  Accountant: Calculator,
  Nurse: HeartPulse,
  Stenographer: Keyboard,
  "Medical Officer": Stethoscope,
  "10th Pass": School,
  "12th Pass": School,
  ITI: Hammer,
  Diploma: Award,
  Graduate: GraduationCap,
  "Post Graduate": BookOpenCheck,
  BCA: Keyboard,
  MCA: Keyboard,
  Bank: Landmark,
  Railway: TrainFront,
  Defence: Shield,
  Police: Siren,
  SSC: ClipboardList,
  UPSC: Award,
  "Post Office": Mail,
  "State PSC": Building2,
};

const directoryItemTones: Record<string, "sky" | "amber" | "coral" | "rose" | "violet" | "cyan" | "mint" | "blue"> = {
  Apprentice: "sky",
  Teacher: "rose",
  Clerk: "amber",
  Engineer: "sky",
  Accountant: "mint",
  Nurse: "rose",
  Stenographer: "mint",
  "Medical Officer": "violet",
  "10th Pass": "sky",
  "12th Pass": "amber",
  ITI: "coral",
  Diploma: "coral",
  Graduate: "sky",
  "Post Graduate": "cyan",
  BCA: "mint",
  MCA: "rose",
  Bank: "sky",
  Railway: "rose",
  Defence: "amber",
  Police: "mint",
  SSC: "blue",
  UPSC: "cyan",
  "Post Office": "mint",
  "State PSC": "blue",
};

type DirectoryGroup = {
  eyebrow: string;
  title: string;
  icon: LucideIcon;
  items: string[];
};

const directoryGroups: DirectoryGroup[] = [
  {
    eyebrow: "Find the right role",
    title: "Govt Jobs by Positions",
    icon: UserRoundSearch,
    items: ["Apprentice", "Teacher", "Clerk", "Engineer", "Accountant", "Nurse", "Stenographer", "Medical Officer"],
  },
  {
    eyebrow: "Match your education",
    title: "Govt Jobs by Qualification",
    icon: GraduationCap,
    items: ["10th Pass", "12th Pass", "ITI", "Diploma", "Graduate", "Post Graduate", "BCA", "MCA"],
  },
  {
    eyebrow: "Explore every sector",
    title: "Govt Jobs by Department",
    icon: Building2,
    items: ["Bank", "Railway", "Defence", "Police", "SSC", "UPSC", "Post Office", "State PSC"],
  },
];

const states = [
  "All India", "Uttar Pradesh", "Bihar", "Delhi", "Rajasthan", "Maharashtra", "Madhya Pradesh", "Haryana", "Punjab",
  "Gujarat", "West Bengal", "Tamil Nadu", "Karnataka", "Telangana", "Odisha", "Assam", "Kerala", "Jharkhand",
];

const shortDate = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" });

const toPortalArticle = (article: DbArticle): PortalArticle => ({
  slug: article.slug,
  title: article.title,
  description: article.description || "Read the complete notification, important dates and official instructions.",
  category: normalizeSarkariCategory(article.category || article.vertical),
  createdAt: article.created_at,
  isNew: Date.now() - new Date(article.created_at).getTime() < 7 * 86400000,
});

const TRENDING_ITEM_LIMIT = 8;
const TRENDING_PAGE_SIZE = 3;
const UPDATE_ITEM_LIMIT = Math.min(SARKARI_ARCHIVE_PAGE_SIZE, 8);
const categorySectionTitles: Record<string, string> = {
  "Latest Jobs": `Latest Govt Jobs ${buildYear}`,
  Results: "Latest Results",
  "Admit Card": "Latest Admit Cards",
  "Answer Key": "Latest Answer Keys",
  Admissions: "Latest Admissions",
  Syllabus: "Latest Syllabus",
  Scholarships: "Latest Scholarships",
};

export default function Index() {
  const location = useLocation();
  const { tag: routeTag = "" } = useParams<{ tag?: string }>();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const requestedCategory = params.get("category") || "";
  const activeCategory = isSarkariCategory(requestedCategory) ? requestedCategory : "";
  const searchTerm = (params.get("q") || "").trim();
  const tagTerm = routeTag.trim();
  const requestedPage = Number.parseInt(params.get("page") || "1", 10);
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const hasFilters = Boolean(activeCategory || searchTerm || tagTerm);
  const homeQuery = useSarkariHomepageArticles(SARKARI_CATEGORIES, !hasFilters);
  const archiveQuery = usePublicArticleArchive({
    category: activeCategory,
    search: searchTerm,
    tag: tagTerm,
    page: currentPage,
    enabled: hasFilters,
  });
  const isLoading = hasFilters ? archiveQuery.isLoading : homeQuery.isLoading;
  const loadError = hasFilters ? archiveQuery.error : homeQuery.error;

  useEffect(() => setQuery(searchTerm), [searchTerm]);

  const pageTitle = tagTerm
    ? `${tagTerm.replace(/[-_]+/g, " ")} - Government Updates | Sarkari DekhoCampus`
    : activeCategory
      ? `${activeCategory} - Latest Government Updates | Sarkari DekhoCampus`
      : "Sarkari DekhoCampus - Latest Jobs, Results & Admit Cards";
  const canonicalPath = tagTerm
    ? `/news/tag/${encodeURIComponent(tagTerm)}`
    : activeCategory
      ? `/?category=${encodeURIComponent(activeCategory)}${currentPage > 1 ? `&page=${currentPage}` : ""}`
      : "/";

  const headlineArticles = useMemo(
    () => (homeQuery.data?.latest || []).map(toPortalArticle),
    [homeQuery.data?.latest]
  );
  const trendingPages = useMemo(() => {
    const items = headlineArticles.slice(0, TRENDING_ITEM_LIMIT);
    return Array.from(
      { length: Math.ceil(items.length / TRENDING_PAGE_SIZE) },
      (_, pageIndex) => items.slice(pageIndex * TRENDING_PAGE_SIZE, (pageIndex + 1) * TRENDING_PAGE_SIZE),
    );
  }, [headlineArticles]);
  const groups = useMemo(() => SARKARI_CATEGORIES.map((category) => ({
    category,
    items: (homeQuery.data?.byCategory[category] || []).map(toPortalArticle),
  })).filter((group) => group.items.length), [homeQuery.data?.byCategory]);
  const archiveArticles = useMemo(
    () => (archiveQuery.data?.rows || []).map(toPortalArticle),
    [archiveQuery.data?.rows]
  );
  const emptyArchive = hasFilters && !isLoading && !loadError && archiveArticles.length === 0;
  const unsupportedArchiveQuery = Boolean(requestedCategory && !activeCategory);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const next = new URLSearchParams(params);
    if (query.trim()) next.set("q", query.trim());
    else next.delete("q");
    next.delete("page");
    setParams(next);
  };

  const alertChannelUrl = String(import.meta.env.VITE_ALERT_CHANNEL_URL || "").trim();
  const visibleGroups = hasFilters
    ? [{ category: activeCategory || (tagTerm ? `Topic: ${tagTerm}` : "Search results"), items: archiveArticles }]
    : groups;
  const archiveHref = (page: number) => {
    const next = new URLSearchParams(params);
    if (page > 1) next.set("page", String(page));
    else next.delete("page");
    const queryString = next.toString();
    return `${location.pathname}${queryString ? `?${queryString}` : ""}`;
  };

  return (
    <div className="sarkari-site">
      <SEO
        title={pageTitle}
        description="Latest government jobs, results, admit cards, answer keys, admissions, syllabus and scholarship updates in one place."
        canonical={canonicalPath}
        keywords="government jobs, government exam results, public sector recruitment, admit card, answer key, online form"
        ogImage={SITE_CONFIG.ogImagePath}
        ogImageAlt="Sarkari DekhoCampus DC logo"
        twitterCard="summary"
        noIndex={Boolean(searchTerm) || emptyArchive || unsupportedArchiveQuery}
      />
      <a className="sarkari-skip-link" href="#content">Skip to main content</a>
      <SarkariHeader />
      <SarkariAdSlot placement="homepage" position="top" pageKey="homepage" className="sarkari-ad-placement sarkari-ad-placement--rectangle" />

      <main id="content">
        <div className="sarkari-home-initial-viewport">
          <section className="sarkari-hero">
            <div className="sarkari-hero-inner">
              <span className="sarkari-eyebrow"><img src={SITE_CONFIG.compactLogoPath} alt="" width="128" height="123" aria-hidden="true" /> Fresh government updates</span>
              <h1>Your shortcut to <em>government opportunities</em></h1>
              <p>Find jobs, results, admit cards and answer keys, with important dates and official next steps up front.</p>
              <form className="sarkari-search" role="search" aria-label="Search Sarkari updates" onSubmit={submitSearch}>
                <label className="sr-only" htmlFor="sarkari-home-search">Search Sarkari updates</label>
                <Search aria-hidden="true" />
                <input id="sarkari-home-search" name="q" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search exam, department, post or notification" />
                <button type="submit">Search</button>
              </form>
            </div>
          </section>

          <div className="sarkari-main sarkari-dense-home sarkari-home-feed-main">
            <div className="sarkari-home-feed-region">
          {!hasFilters && headlineArticles.length > 0 && (
            <section className="sarkari-trending sarkari-dense-trending" aria-labelledby="trending-heading">
              <div className="sarkari-section-heading sarkari-dense-section-heading sarkari-trending-heading">
                <div><span>Updated daily</span><h2 id="trending-heading">Trending Govt Jobs</h2></div>
                <Link to="/?category=Latest%20Jobs">View More <ArrowRight aria-hidden="true" /></Link>
              </div>
              <SarkariCarousel ariaLabel="Trending government jobs" className="sarkari-trending-carousel">
                {trendingPages.map((page, pageIndex) => (
                  <ol className="sarkari-trending-page" start={pageIndex * TRENDING_PAGE_SIZE + 1} key={page[0]?.slug || pageIndex}>
                    {page.map((article, articleIndex) => {
                      const ordinal = pageIndex * TRENDING_PAGE_SIZE + articleIndex + 1;
                      return (
                        <li key={article.slug}>
                          <Link className="sarkari-trending-card sarkari-dense-trending-card" to={`/news/${article.slug}`}>
                            <span className="sarkari-trending-number" aria-hidden="true">{ordinal}</span>
                            <div className="sarkari-trending-card-body">
                              <h3>{article.title}</h3>
                              <p>{article.description}</p>
                              <footer>
                                <span><CalendarDays aria-hidden="true" /> Published <time dateTime={article.createdAt}>{shortDate.format(new Date(article.createdAt))}</time></span>
                                <ArrowRight aria-hidden="true" />
                              </footer>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                ))}
              </SarkariCarousel>
            </section>
          )}

          {hasFilters && (
            <div className="sarkari-filter-summary" role="status" aria-live="polite">
              <p>Showing <strong>{archiveArticles.length}</strong> update{archiveArticles.length === 1 ? "" : "s"}{activeCategory ? ` in ${activeCategory}` : ""}{tagTerm ? ` tagged “${tagTerm}”` : ""}{searchTerm ? ` for “${searchTerm}”` : ""}{currentPage > 1 ? ` on page ${currentPage}` : ""}</p>
              <Link to="/">Clear filters</Link>
            </div>
          )}

          {loadError ? (
            <div className="sarkari-empty" role="alert">We could not load the latest updates. Please try again shortly.</div>
          ) : isLoading ? (
            <div className="sarkari-loading">Loading latest updates...</div>
          ) : visibleGroups.length ? (
            <section className="sarkari-update-sections sarkari-dense-update-sections" aria-label="Latest updates by category">
              {visibleGroups.map((group, groupIndex) => (
                <Fragment key={group.category}>
                <section className="sarkari-update-row sarkari-dense-update-row" aria-labelledby={`sarkari-update-heading-${groupIndex}`}>
                  <div className="sarkari-update-row-heading">
                    <div>
                      <small>{hasFilters ? "Matching updates" : "Latest section"}</small>
                      <h2 id={`sarkari-update-heading-${groupIndex}`}>{hasFilters ? group.category : (categorySectionTitles[group.category] || group.category)}</h2>
                    </div>
                    {!hasFilters && <Link to={`/?category=${encodeURIComponent(group.category)}`}>View More <ArrowRight aria-hidden="true" /></Link>}
                  </div>
                  {group.items.length ? (
                    <ol className="sarkari-update-grid sarkari-dense-update-grid" start={hasFilters ? (currentPage - 1) * SARKARI_ARCHIVE_PAGE_SIZE + 1 : undefined}>
                      {group.items.slice(0, hasFilters ? SARKARI_ARCHIVE_PAGE_SIZE : UPDATE_ITEM_LIMIT).map((article, articleIndex) => (
                        <li className="sarkari-update-card sarkari-dense-update-card" key={article.slug}>
                          <Link to={`/news/${article.slug}`}>
                            <span className="sarkari-update-number" aria-hidden="true">{hasFilters ? (currentPage - 1) * SARKARI_ARCHIVE_PAGE_SIZE + articleIndex + 1 : articleIndex + 1}</span>
                            <span className="sarkari-dense-update-title">{article.title}</span>
                            {article.isNew && <span className="sarkari-dense-new-label">New</span>}
                          </Link>
                        </li>
                      ))}
                    </ol>
                  ) : <p className="sarkari-empty">No matching updates found.</p>}
                </section>
                {!hasFilters && group.category === "Latest Jobs" && (
                  <SarkariAdSlot placement="homepage" position="after-latest-jobs" pageKey="homepage" category={group.category} className="sarkari-ad-placement sarkari-ad-placement--wide" />
                )}
                {!hasFilters && group.category === "Admit Card" && (
                  <SarkariAdSlot placement="homepage" position="after-admit-cards" pageKey="homepage" category={group.category} className="sarkari-ad-placement sarkari-ad-placement--wide" />
                )}
                </Fragment>
              ))}
              {hasFilters && (currentPage > 1 || archiveQuery.data?.hasNextPage) && (
                <nav className="sarkari-archive-pagination" aria-label="Update results pages">
                  {currentPage > 1 ? <Link to={archiveHref(currentPage - 1)}>Previous</Link> : <span aria-hidden="true" />}
                  <span>Page {currentPage}</span>
                  {archiveQuery.data?.hasNextPage ? <Link to={archiveHref(currentPage + 1)}>Next</Link> : <span aria-hidden="true" />}
                </nav>
              )}
            </section>
          ) : <div className="sarkari-empty">No published updates are available yet.</div>}
            </div>
          </div>
        </div>

        <div className="sarkari-main sarkari-dense-home sarkari-home-lower-content">
          {!hasFilters && (
            <section className="sarkari-discovery sarkari-dense-discovery" aria-label="Browse government jobs">
              {directoryGroups.map(({ eyebrow, title, icon: Icon, items }, groupIndex) => (
                <Fragment key={title}>
                <section className="sarkari-browse-section" aria-labelledby={`sarkari-browse-heading-${groupIndex}`}>
                  <div className="sarkari-section-heading sarkari-dense-section-heading">
                    <div><span>{eyebrow}</span><h2 id={`sarkari-browse-heading-${groupIndex}`}>{title}</h2></div>
                    <Icon aria-hidden="true" />
                  </div>
                  <ul className="sarkari-browse-grid">
                    {items.map((item) => {
                      const ItemIcon = directoryItemIcons[item] || BriefcaseBusiness;
                      const iconTone = directoryItemTones[item] || "blue";
                      return (
                        <li key={item}>
                          <Link className="sarkari-browse-card" to={`/?q=${encodeURIComponent(item)}`}>
                            <span className="sarkari-directory-item-label"><i className={`sarkari-item-icon sarkari-item-icon--${iconTone}`}><ItemIcon aria-hidden="true" /></i><span>{item}</span></span>
                            <ChevronRight aria-hidden="true" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
                {groupIndex === 0 && <SarkariAdSlot placement="homepage" position="after-positions" pageKey="homepage" className="sarkari-ad-placement sarkari-ad-placement--wide" />}
                {groupIndex === 2 && <SarkariAdSlot placement="homepage" position="after-department" pageKey="homepage" className="sarkari-ad-placement sarkari-ad-placement--wide" />}
                </Fragment>
              ))}

              <section className="sarkari-browse-section sarkari-states" aria-labelledby="sarkari-state-heading">
                <div className="sarkari-section-heading sarkari-dense-section-heading">
                  <div><span>Opportunities near you</span><h2 id="sarkari-state-heading">Govt Jobs by States</h2></div>
                  <MapPin aria-hidden="true" />
                </div>
                <ul className="sarkari-browse-grid">
                  {states.map((state) => (
                    <li key={state}>
                      <Link className="sarkari-browse-card" to={`/?q=${encodeURIComponent(state)}`}>
                        <span className="sarkari-directory-item-label"><i className="sarkari-item-icon sarkari-item-icon--blue"><MapPin aria-hidden="true" /></i><span>{state}</span></span>
                        <ChevronRight aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              <aside className="sarkari-alert-cta" aria-label="Daily update alerts">
                <div>
                  <span><BellRing aria-hidden="true" /> Never miss an important date</span>
                  <h2>Get the latest government updates in one place</h2>
                  <p>Check fresh jobs, results, admit cards and answer keys through our free article alert hub.</p>
                </div>
                {alertChannelUrl ? (
                  <a href={alertChannelUrl} target="_blank" rel="noopener noreferrer">Join free alert channel <ArrowRight aria-hidden="true" /></a>
                ) : (
                  <Link to="/?category=Latest%20Jobs">See today&apos;s updates <ArrowRight aria-hidden="true" /></Link>
                )}
              </aside>
              <SarkariAdSlot placement="homepage" position="bottom" pageKey="homepage" className="sarkari-ad-placement sarkari-ad-placement--rectangle" />
            </section>
          )}

          <section className="sarkari-about">
            <span>Simple. Useful. Responsible.</span>
            <h2>Government updates without the noise</h2>
            <p>Sarkari DekhoCampus brings job notifications, exam results, admit cards, answer keys, admissions and scholarships into a clear article-first experience.</p>
            <p>We do not conduct examinations or recruitment. Always confirm every deadline, fee, eligibility rule and result on the official authority website before taking action.</p>
          </section>
        </div>
      </main>

      <SarkariFooter />
    </div>
  );
}
