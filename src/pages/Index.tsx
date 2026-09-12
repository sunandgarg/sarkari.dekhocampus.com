import { ArrowRight, Award, BellRing, BookOpenCheck, BriefcaseBusiness, Building2, Calculator, CalendarDays, CheckCircle2, ChevronRight, ClipboardList, FileCheck2, GraduationCap, Hammer, HeartPulse, Keyboard, Landmark, Mail, MapPin, School, Search, Shield, ShieldCheck, Siren, Sparkles, Stethoscope, TrainFront, UserRoundSearch, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { SarkariFooter } from "@/components/sarkari/SarkariFooter";
import { SarkariHeader } from "@/components/sarkari/SarkariHeader";
import { SarkariCarousel } from "@/components/sarkari/SarkariCarousel";
import { SARKARI_ARCHIVE_PAGE_SIZE, usePublicArticleArchive, useSarkariHomepageArticles, type DbArticle } from "@/hooks/useArticlesData";
import { isSarkariCategory, normalizeSarkariCategory, SARKARI_CATEGORIES } from "@/lib/sarkariCategories";
import { SITE_CONFIG } from "@/lib/constant";

type PortalArticle = {
  slug: string;
  title: string;
  description: string;
  category: string;
  createdAt: string;
  tags: string[];
  isNew?: boolean;
};

const categoryIcons = [BriefcaseBusiness, CheckCircle2, FileCheck2, BookOpenCheck, GraduationCap, CalendarDays, Landmark];

const categoryGuidance: Record<string, { action: string; detail: string }> = {
  "Latest Jobs": { action: "Find a job", detail: "Open forms & vacancies" },
  Results: { action: "Check a result", detail: "Scores, merit lists & cut-offs" },
  "Admit Card": { action: "Get an admit card", detail: "Hall tickets & exam cities" },
  "Answer Key": { action: "See an answer key", detail: "Responses & objections" },
  Admissions: { action: "Explore admission", detail: "Counselling & applications" },
  Syllabus: { action: "Plan preparation", detail: "Syllabus & exam patterns" },
  Scholarships: { action: "Find support", detail: "Scholarships & eligibility" },
};

const popularSearches = ["10th Pass", "Railway", "SSC", "Bank"];

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

const stateCodes: Record<string, string> = {
  "All India": "IN",
  "Uttar Pradesh": "UP",
  Bihar: "BR",
  Delhi: "DL",
  Rajasthan: "RJ",
  Maharashtra: "MH",
  "Madhya Pradesh": "MP",
  Haryana: "HR",
  Punjab: "PB",
  Gujarat: "GJ",
  "West Bengal": "WB",
  "Tamil Nadu": "TN",
  Karnataka: "KA",
  Telangana: "TS",
  Odisha: "OD",
  Assam: "AS",
  Kerala: "KL",
  Jharkhand: "JH",
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
    title: "Government jobs by position",
    icon: UserRoundSearch,
    items: ["Apprentice", "Teacher", "Clerk", "Engineer", "Accountant", "Nurse", "Stenographer", "Medical Officer"],
  },
  {
    eyebrow: "Match your education",
    title: "Government jobs by qualification",
    icon: GraduationCap,
    items: ["10th Pass", "12th Pass", "ITI", "Diploma", "Graduate", "Post Graduate", "BCA", "MCA"],
  },
  {
    eyebrow: "Explore every sector",
    title: "Government jobs by department",
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
  tags: article.tags || [],
  isNew: Date.now() - new Date(article.created_at).getTime() < 7 * 86400000,
});

export default function Index() {
  const location = useLocation();
  const { tag: routeTag = "" } = useParams<{ tag?: string }>();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [expandedDirectories, setExpandedDirectories] = useState<Record<string, boolean>>({});
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
        keywords="sarkari result, government jobs, admit card, exam result, sarkari naukri, online form"
        ogImage={SITE_CONFIG.ogImagePath}
        ogImageAlt="Sarkari DekhoCampus"
        twitterCard="summary"
        noIndex={Boolean(searchTerm) || emptyArchive || unsupportedArchiveQuery}
      />
      <a className="sarkari-skip-link" href="#content">Skip to main content</a>
      <SarkariHeader />

      <main id="content">
        <section className="sarkari-hero">
          <div className="sarkari-hero-inner">
            <span className="sarkari-eyebrow"><Sparkles /> AI-assisted discovery, written for people</span>
            <h1>Your shortcut to <em>government opportunities</em></h1>
            <p>Find jobs, results, admit cards and answer keys in a clear format, with important dates and official next steps up front.</p>
            <form className="sarkari-search" role="search" aria-label="Search Sarkari updates" onSubmit={submitSearch}>
              <label className="sr-only" htmlFor="sarkari-home-search">Search Sarkari updates</label>
              <Search aria-hidden="true" />
              <input id="sarkari-home-search" name="q" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search exam, department, post or notification" aria-describedby="sarkari-search-help" />
              <button type="submit">Find updates</button>
            </form>
            <div className="sarkari-search-help" id="sarkari-search-help">
              <span>Popular:</span>
              {popularSearches.map((item) => <Link key={item} to={`/?q=${encodeURIComponent(item)}`}>{item}</Link>)}
            </div>
            <div className="sarkari-trust-row" aria-label="Portal commitments">
              <span><CheckCircle2 /> Clear eligibility</span>
              <span><ShieldCheck /> Official links first</span>
              <span><CheckCircle2 /> No job fees charged by us</span>
            </div>
          </div>
        </section>

        <div className="sarkari-main">
          <section className="sarkari-task-dock" aria-labelledby="task-dock-title">
            <div className="sarkari-dock-intro">
              <span>Start here</span>
              <h2 id="task-dock-title">What do you want to do?</h2>
              <p>Choose one clear next step.</p>
            </div>
            <div className="sarkari-category-dock">
              {SARKARI_CATEGORIES.map((category, index) => {
                const Icon = categoryIcons[index];
                const guidance = categoryGuidance[category];
                return (
                  <Link key={category} to={`/?category=${encodeURIComponent(category)}`}>
                    <Icon aria-hidden="true" />
                    <span><strong>{guidance.action}</strong><small>{guidance.detail}</small></span>
                    <ChevronRight aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </section>

          {!hasFilters && headlineArticles.length > 0 && (
            <>
              <section className="sarkari-alert-strip" aria-label="Latest alerts">
                <strong><BellRing /> Latest alerts</strong>
                <div>{headlineArticles.slice(0, 4).map((article, index) => <span key={article.slug}><Link to={`/news/${article.slug}`}>{article.title}</Link>{index < Math.min(3, headlineArticles.length - 1) && <i>•</i>}</span>)}</div>
              </section>

              <section className="sarkari-trending" aria-labelledby="trending-heading">
                <div className="sarkari-section-heading">
                  <div><span>Updated daily</span><h2 id="trending-heading">Trending government updates</h2></div>
                  <Link to="/?category=Latest%20Jobs">View all <ArrowRight /></Link>
                </div>
                <div className="sarkari-trending-grid">
                  <SarkariCarousel ariaLabel="Trending government updates">
                  {headlineArticles.slice(0, SARKARI_ARCHIVE_PAGE_SIZE).map((article) => (
                    <Link className="sarkari-trending-card" key={article.slug} to={`/news/${article.slug}`}>
                      <div><span>{article.category}</span>{article.isNew && <em>New</em>}</div>
                      <h3>{article.title}</h3>
                      <p>{article.description}</p>
                      <footer><time dateTime={article.createdAt}>{shortDate.format(new Date(article.createdAt))}</time><ArrowRight /></footer>
                    </Link>
                  ))}
                  </SarkariCarousel>
                </div>
              </section>
            </>
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
          <section className="sarkari-update-sections" aria-label="Latest updates by category">
            {visibleGroups.map((group, groupIndex) => (
              <section className="sarkari-update-row" key={group.category}>
                <div className="sarkari-update-row-heading">
                  <span>{groupIndex % 3 === 0 ? <CalendarDays /> : groupIndex % 3 === 1 ? <FileCheck2 /> : <CheckCircle2 />}</span>
                  <div><small>Latest section</small><h2>{group.category}</h2></div>
                  {!hasFilters && <Link to={`/?category=${encodeURIComponent(group.category)}`}>View all <ArrowRight /></Link>}
                </div>
                {group.items.length ? (
                  <SarkariCarousel ariaLabel={`${group.category} updates`}>
                    {group.items.slice(0, 9).map((article) => (
                      <Link className="sarkari-update-card" key={article.slug} to={`/news/${article.slug}`}>
                        <div><span>{article.category}</span>{article.isNew && <em>New</em>}</div>
                        <h3>{article.title}</h3>
                        <p>{article.description}</p>
                        <footer><time dateTime={article.createdAt}>{shortDate.format(new Date(article.createdAt))}</time><ArrowRight /></footer>
                      </Link>
                    ))}
                  </SarkariCarousel>
                ) : <p className="sarkari-empty">No matching updates found.</p>}
              </section>
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

          {!hasFilters && (
            <section className="sarkari-discovery" aria-label="Browse government jobs">
              {directoryGroups.map(({ eyebrow, title, icon: Icon, items }) => {
                const expanded = Boolean(expandedDirectories[title]);
                return (
                <div className={`sarkari-directory ${expanded ? "is-expanded" : ""}`} key={title}>
                  <div className="sarkari-section-heading">
                    <div><span>{eyebrow}</span><h2>{title}</h2></div>
                    <div className="sarkari-directory-actions"><Icon aria-hidden="true" /><button type="button" onClick={() => setExpandedDirectories((current) => ({ ...current, [title]: !expanded }))} aria-expanded={expanded}>{expanded ? "Show less" : `Show all ${items.length}`}</button></div>
                  </div>
                  <div className="sarkari-directory-grid">
                    {items.map((item) => {
                      const ItemIcon = directoryItemIcons[item] || BriefcaseBusiness;
                      return (
                        <Link key={item} to={`/?q=${encodeURIComponent(item)}`}>
                          <span className="sarkari-directory-item-label"><i className="sarkari-item-icon"><ItemIcon aria-hidden="true" /></i><span>{item}</span></span>
                          <ChevronRight aria-hidden="true" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );})}

              <div className={`sarkari-directory sarkari-states ${expandedDirectories.states ? "is-expanded" : ""}`}>
                <div className="sarkari-section-heading">
                  <div><span>Opportunities near you</span><h2>Government jobs by state</h2></div>
                  <div className="sarkari-directory-actions"><MapPin aria-hidden="true" /><button type="button" onClick={() => setExpandedDirectories((current) => ({ ...current, states: !current.states }))} aria-expanded={Boolean(expandedDirectories.states)}>{expandedDirectories.states ? "Show less" : `Show all ${states.length}`}</button></div>
                </div>
                <div className="sarkari-directory-grid">
                  {states.map((state) => (
                    <Link key={state} to={`/?q=${encodeURIComponent(state)}`}>
                      <span className="sarkari-directory-item-label"><i className="sarkari-state-code" aria-hidden="true">{stateCodes[state]}</i><span>{state}</span></span>
                      <ChevronRight aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </div>

              <aside className="sarkari-alert-cta" aria-label="Daily update alerts">
                <div>
                  <span><BellRing aria-hidden="true" /> Never miss an important date</span>
                  <h2>Get the latest government updates in one place</h2>
                  <p>Check fresh jobs, results, admit cards and answer keys through our free article alert hub.</p>
                </div>
                {alertChannelUrl ? (
                  <a href={alertChannelUrl} target="_blank" rel="noopener noreferrer">Join free alert channel <ArrowRight /></a>
                ) : (
                  <Link to="/?category=Latest%20Jobs">See today&apos;s updates <ArrowRight /></Link>
                )}
              </aside>
            </section>
          )}

          <section className="sarkari-about">
            <span>Simple. Useful. Responsible.</span>
            <h2>Government updates without the noise</h2>
            <p>Sarkari DekhoCampus brings job notifications, exam results, admit cards, answer keys, admissions and scholarships into a clear article-first experience. Important eligibility, dates and next steps are placed up front.</p>
            <p>We do not conduct examinations or recruitment. Always confirm every deadline, fee, eligibility rule and result on the official authority website before taking action.</p>
          </section>
        </div>
      </main>

      <SarkariFooter />
    </div>
  );
}
