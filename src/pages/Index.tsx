import { ArrowRight, Award, BellRing, BookOpenCheck, BriefcaseBusiness, Building2, Calculator, CalendarDays, CheckCircle2, ChevronRight, ClipboardList, FileCheck2, GraduationCap, Hammer, HeartPulse, Keyboard, Landmark, Mail, MapPin, School, Search, Shield, ShieldCheck, Siren, Sparkles, Stethoscope, TrainFront, UserRoundSearch, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { SarkariFooter } from "@/components/sarkari/SarkariFooter";
import { SarkariHeader } from "@/components/sarkari/SarkariHeader";
import { SarkariCarousel } from "@/components/sarkari/SarkariCarousel";
import { useDbArticles } from "@/hooks/useArticlesData";
import { sarkariArticles, sarkariCategories } from "@/data/sarkariArticles";

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

const normaliseCategory = (value: string) => {
  const category = value.toLowerCase();
  if (category.includes("result")) return "Results";
  if (category.includes("admit") || category.includes("hall ticket")) return "Admit Card";
  if (category.includes("answer")) return "Answer Key";
  if (category.includes("admission") || category.includes("counselling")) return "Admissions";
  if (category.includes("syllabus") || category.includes("pattern")) return "Syllabus";
  if (category.includes("scholar")) return "Scholarships";
  if (category.includes("job") || category.includes("vacanc") || category.includes("recruit")) return "Latest Jobs";
  return value || "Latest Jobs";
};

const shortDate = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" });

export default function Index() {
  const { data: dbArticleData, isLoading } = useDbArticles();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [expandedDirectories, setExpandedDirectories] = useState<Record<string, boolean>>({});
  const activeCategory = params.get("category") || "";
  const searchTerm = (params.get("q") || "").trim();
  const pageTitle = activeCategory
    ? `${activeCategory} - Latest Government Updates | Sarkari DekhoCampus`
    : "Sarkari DekhoCampus - Latest Jobs, Results & Admit Cards";
  const canonicalPath = activeCategory
    ? `/?category=${encodeURIComponent(activeCategory)}`
    : location.pathname === "/news" ? "/news" : "/";

  const articles = useMemo<PortalArticle[]>(() => {
    const dbArticles = Array.isArray(dbArticleData) ? dbArticleData : [];
    const dynamic = dbArticles
      .filter((article) => article.status === "Published" || !article.status)
      .map((article) => ({
        slug: article.slug,
        title: article.title,
        description: article.description || "Read the complete notification, important dates and official instructions.",
        category: normaliseCategory(article.category || article.vertical || ""),
        createdAt: article.created_at,
        tags: article.tags || [],
        isNew: Date.now() - new Date(article.created_at).getTime() < 7 * 86400000,
      }));
    const fallback = sarkariArticles.map((article) => ({
      slug: article.slug,
      title: article.title,
      description: article.excerpt,
      category: article.category,
      createdAt: article.publishedAt,
      tags: article.tags,
      isNew: true,
    }));
    const seen = new Set<string>();
    return [...dynamic, ...fallback].filter((article) => !seen.has(article.slug) && seen.add(article.slug));
  }, [dbArticleData]);

  const filtered = useMemo(() => {
    const needle = (params.get("q") || "").trim().toLowerCase();
    return articles.filter((article) => {
      const categoryMatches = !activeCategory || article.category === activeCategory;
      const queryMatches = !needle || `${article.title} ${article.description} ${article.tags.join(" ")}`.toLowerCase().includes(needle);
      return categoryMatches && queryMatches;
    });
  }, [activeCategory, articles, params]);

  const groups = useMemo(() => sarkariCategories.map((category) => ({
    category,
    items: articles.filter((article) => article.category === category).slice(0, 9),
  })).filter((group) => group.items.length), [articles]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const next = new URLSearchParams(params);
    if (query.trim()) next.set("q", query.trim());
    else next.delete("q");
    setParams(next);
  };

  const headlineArticles = articles.slice(0, 9);
  const alertChannelUrl = String(import.meta.env.VITE_ALERT_CHANNEL_URL || "").trim();
  const visibleGroups = activeCategory || params.get("q")
    ? [{ category: activeCategory || "Search results", items: filtered }]
    : groups;

  return (
    <div className="sarkari-site">
      <SEO
        title={pageTitle}
        description="Latest government jobs, results, admit cards, answer keys, admissions, syllabus and scholarship updates in one place."
        canonical={canonicalPath}
        keywords="sarkari result, government jobs, admit card, exam result, sarkari naukri, online form"
        noIndex={Boolean(searchTerm)}
      />
      <a className="sarkari-skip-link" href="#content">Skip to main content</a>
      <SarkariHeader />

      <main id="content">
        <section className="sarkari-hero">
          <div className="sarkari-hero-inner">
            <span className="sarkari-eyebrow"><Sparkles /> AI-assisted discovery, written for people</span>
            <h1>Your shortcut to <em>government opportunities</em></h1>
            <p>Find jobs, results, admit cards and answer keys in a clear format, with important dates and official next steps up front.</p>
            <form className="sarkari-search" onSubmit={submitSearch}>
              <Search aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search exam, department, post or notification" aria-label="Search Sarkari updates" aria-describedby="sarkari-search-help" />
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
              {sarkariCategories.map((category, index) => {
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

          <section className="sarkari-alert-strip" aria-label="Latest alerts">
            <strong><BellRing /> Latest alerts</strong>
            <div>{headlineArticles.slice(0, 4).map((article, index) => <span key={article.slug}><Link to={`/news/${article.slug}`}>{article.title}</Link>{index < 3 && <i>•</i>}</span>)}</div>
          </section>

          <section className="sarkari-trending" aria-labelledby="trending-heading">
            <div className="sarkari-section-heading">
              <div><span>Updated daily</span><h2 id="trending-heading">Trending government updates</h2></div>
              <Link to="/?category=Latest%20Jobs">View all <ArrowRight /></Link>
            </div>
            <div className="sarkari-trending-grid">
              <SarkariCarousel ariaLabel="Trending government updates">
              {headlineArticles.slice(0, 9).map((article) => (
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

          {(activeCategory || params.get("q")) && (
          <div className="sarkari-filter-summary" role="status" aria-live="polite">
            <p>Showing <strong>{filtered.length}</strong> update{filtered.length === 1 ? "" : "s"}{activeCategory ? ` in ${activeCategory}` : ""}{params.get("q") ? ` for “${params.get("q")}”` : ""}</p>
            <Link to="/">Clear filters</Link>
          </div>
        )}

          {isLoading && !articles.length ? (
          <div className="sarkari-loading">Loading latest updates...</div>
        ) : (
          <section className="sarkari-update-sections" aria-label="Latest updates by category">
            {visibleGroups.map((group, groupIndex) => (
              <section className="sarkari-update-row" key={group.category}>
                <div className="sarkari-update-row-heading">
                  <span>{groupIndex % 3 === 0 ? <CalendarDays /> : groupIndex % 3 === 1 ? <FileCheck2 /> : <CheckCircle2 />}</span>
                  <div><small>Latest section</small><h2>{group.category}</h2></div>
                  <Link to={`/?category=${encodeURIComponent(group.category)}`}>View all <ArrowRight /></Link>
                </div>
                {group.items.length ? (
                  <SarkariCarousel ariaLabel={`${group.category} updates`}>
                    {group.items.slice(0, 9).map((article) => (
                      <Link className="sarkari-update-card" key={article.slug} to={`/news/${article.slug}`}>
                        <div><span>{group.category}</span>{article.isNew && <em>New</em>}</div>
                        <h3>{article.title}</h3>
                        <p>{article.description}</p>
                        <footer><time dateTime={article.createdAt}>{shortDate.format(new Date(article.createdAt))}</time><ArrowRight /></footer>
                      </Link>
                    ))}
                  </SarkariCarousel>
                ) : <p className="sarkari-empty">No matching updates found.</p>}
              </section>
            ))}
          </section>
        )}

          {!activeCategory && !params.get("q") && (
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
