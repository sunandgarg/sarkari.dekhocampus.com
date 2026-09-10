import { useParams, Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUp, BellRing, Bookmark, BriefcaseBusiness, Calendar, CheckCircle2, Clock, Eye, FileCheck2, Link2, List, Pause, Play, Send, Share2, ShieldCheck, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SarkariHeader } from "@/components/sarkari/SarkariHeader";
import { SarkariFooter } from "@/components/sarkari/SarkariFooter";
import { SarkariCarousel } from "@/components/sarkari/SarkariCarousel";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { Skeleton } from "@/components/ui/skeleton";
import { DeferUntilVisible } from "@/components/DeferUntilVisible";
import { articles as educationArticles } from "@/data/articles";
import { sarkariArticles } from "@/data/sarkariArticles";
import { useDbArticle, useDbArticles } from "@/hooks/useArticlesData";
import { AuthorByline } from "@/components/AuthorByline";
import { useAuth } from "@/hooks/useAuth";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { useSEO } from "@/hooks/useSEO";
import { DocumentViewer } from "@/components/detail/DocumentViewer";
import { RichText } from "@/components/detail/RichText";
import { absoluteCanonical, absoluteSiteUrl, SITE_CONFIG } from "@/lib/constant";
import { lazyRetry } from "@/lib/lazyRetry";
import { stripVisibleArticleSources } from "@/lib/articleContentSanitizer";

// Heavy below-the-fold components - lazy loaded for faster initial paint
const AlsoCheckSection = lazyRetry(() => import("@/components/AlsoCheckSection").then(m => ({ default: m.AlsoCheckSection })), "AlsoCheckSection");
const DynamicAdBanner = lazyRetry(() => import("@/components/DynamicAdBanner").then(m => ({ default: m.DynamicAdBanner })), "DynamicAdBanner");
const GoogleAd = lazyRetry(() => import("@/components/ads/GoogleAd").then(m => ({ default: m.GoogleAd })), "GoogleAd");
const FAQSection = lazyRetry(() => import("@/components/FAQSection").then(m => ({ default: m.FAQSection })), "FAQSection");
const ArticleLinkedResources = lazyRetry(() => import("@/components/detail/ArticleLinkedResources").then(m => ({ default: m.ArticleLinkedResources })), "ArticleLinkedResources");

const staticArticles = [...sarkariArticles, ...educationArticles];

const NEWS_CATEGORIES = [
  { label: "All News", value: "" },
  { label: "Latest Jobs", value: "Latest Jobs" },
  { label: "Results", value: "Results" },
  { label: "Admit Card", value: "Admit Card" },
  { label: "Answer Key", value: "Answer Key" },
  { label: "Admissions", value: "Admissions" },
  { label: "Syllabus", value: "Syllabus" },
  { label: "Scholarships", value: "Scholarships" },
];

function slugifyHeading(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80);
}
function normalizeSlug(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function ArticleDetail() {
  const { slug: rawSlug } = useParams<{ slug: string }>();
  const decoded = decodeURIComponent(rawSlug || "");
  const cleanSlug = normalizeSlug(decoded);
  const needsRedirect = !!(rawSlug && cleanSlug && cleanSlug !== rawSlug && cleanSlug !== decoded);

  const { data: dbArticle, isLoading: dbLoading } = useDbArticle(cleanSlug || rawSlug);
  const { data: dbArticleList } = useDbArticles();
  const staticArticle = staticArticles.find((a) => a.slug === (cleanSlug || rawSlug));
  const article = useMemo(() => {
    if (dbArticle) {
      const text = (dbArticle.description || dbArticle.content || "").replace(/<[^>]+>/g, " ");
      const words = text.split(/\s+/).filter(Boolean).length;
      const mins = Math.max(2, Math.round(words / 200));
      return {
        slug: dbArticle.slug,
        title: dbArticle.title,
        excerpt: (dbArticle.description || "").replace(/<[^>]+>/g, " ").slice(0, 240) || text.slice(0, 240),
        content: stripVisibleArticleSources(dbArticle.content || dbArticle.description || ""),
        category: dbArticle.category || "General",
        image: dbArticle.featured_image || "/placeholder.svg",
        readTime: `${mins} min read`,
        author: dbArticle.author || "Sarkari DekhoCampus Desk",
        publishedAt: new Date(dbArticle.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        views: (dbArticle as any).views ?? 0,
        tags: dbArticle.tags || [],
        author_id: (dbArticle as any).author_id as string | undefined,
      };
    }
    return staticArticle ? { ...staticArticle, content: stripVisibleArticleSources(staticArticle.content), views: 0, author_id: undefined as string | undefined } : null;
  }, [dbArticle, staticArticle]);

  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [progress, setProgress] = useState(0);
  const [tocSheetOpen, setTocSheetOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [saved, setSaved] = useState(false);
  useSEO({
    title: article ? article.title : "Article",
    description: article?.excerpt || "Read the latest education and career articles.",
    canonical: article ? `/news/${article.slug}` : undefined,
    ogImage: article?.image || SITE_CONFIG.ogImagePath,
    ogType: "article",
    noIndex: !article && !dbLoading,
    jsonLd: article ? {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: article.title,
      description: article.excerpt || undefined,
      image: article.image ? [absoluteCanonical(article.image)] : undefined,
      datePublished: dbArticle?.created_at || undefined,
      dateModified: dbArticle?.updated_at || dbArticle?.created_at || undefined,
      author: { "@type": "Person", name: article.author || "Sarkari DekhoCampus Desk" },
      publisher: {
        "@type": "Organization",
        name: "Sarkari DekhoCampus",
        logo: { "@type": "ImageObject", url: absoluteSiteUrl(SITE_CONFIG.logoPath) },
      },
      mainEntityOfPage: absoluteSiteUrl(`/news/${article.slug}`),
      articleSection: article.category || undefined,
      keywords: article.tags?.length ? article.tags.join(", ") : undefined,
    } : undefined,
  });

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? Math.min(100, (window.scrollY / total) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [cleanSlug]);

  useEffect(() => () => { if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel(); }, []);

  // Hydrate saved state from localStorage when user/article changes (kept before early returns)
  useEffect(() => {
    if (!user || !article) { setSaved(false); return; }
    try {
      const list: string[] = JSON.parse(localStorage.getItem(`dc_saved_articles_${user.id}`) || "[]");
      setSaved(list.includes(article.slug));
    } catch { setSaved(false); }
  }, [article, user]);


  const recommendations = useMemo(() => {
    if (!article) return [];
    const tagSet = new Set(article.tags);
    const dynamicArticles = (dbArticleList || []).map((item) => ({
      slug: item.slug,
      title: item.title,
      excerpt: item.description || "Read the latest eligibility, dates and official next steps.",
      category: item.category || item.vertical || "Latest Jobs",
      image: item.featured_image || "/placeholder.svg",
      readTime: "Latest update",
      publishedAt: new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      tags: item.tags || [],
    }));
    const seen = new Set<string>();
    return [...dynamicArticles, ...staticArticles]
      .filter((candidate) => !seen.has(candidate.slug) && seen.add(candidate.slug))
      .filter((a) => a.slug !== article.slug)
      .map((a) => ({ a, score: a.tags.filter((t) => tagSet.has(t)).length * 3 + (a.category === article.category ? 10 : 0) }))
      .sort((x, y) => y.score - x.score)
      .slice(0, 9)
      .map((x) => x.a);
  }, [article, dbArticleList]);

  const toc = useMemo(() => {
    if (!article?.content) return [] as { id: string; text: string; level: number }[];
    const out: { id: string; text: string; level: number }[] = [];
    if (article.content.trim().startsWith("<")) {
      const re = /<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(article.content))) {
        const text = m[2].replace(/<[^>]+>/g, "").trim();
        if (text) out.push({ id: slugifyHeading(text), text, level: parseInt(m[1]) });
      }
    } else {
      const re = /^(#{2,3})\s+(.+?)\s*$/gm;
      let m: RegExpExecArray | null;
      while ((m = re.exec(article.content))) {
        const text = m[2].replace(/[*_`]/g, "");
        out.push({ id: slugifyHeading(text), text, level: m[1].length });
      }
    }
    return out;
  }, [article?.content]);

  const jumpTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  };

  // Inject IDs onto h2/h3 of HTML content for TOC anchors - must run before early returns
  // Also split out <div class="doc-viewer" ...>...</div> blocks so they can be rendered as React.
  const contentSegments = useMemo(() => {
    const c = article?.content || "";
    if (!c.trim().startsWith("<")) return null;
    let html = c.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (_full, lvl, attrs, inner) => {
      const text = inner.replace(/<[^>]+>/g, "").trim();
      const id = slugifyHeading(text);
      return `<h${lvl}${attrs} id="${id}">${inner}</h${lvl}>`;
    });
    html = html.replace(/<table(\s[^>]*)?>([\s\S]*?)<\/table>/gi, (m) => `<div class="table-wrap">${m}</div>`);
    // Parse out doc-viewer blocks
    const segs: Array<{ type: "html"; value: string } | { type: "doc"; title: string; images: string[] }> = [];
    const re = /<div\s+class="doc-viewer"([^>]*)>([\s\S]*?)<\/div>/gi;
    let last = 0; let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
      if (m.index > last) segs.push({ type: "html", value: html.slice(last, m.index) });
      const attrs = m[1] || "";
      const inner = m[2] || "";
      const titleMatch = attrs.match(/data-title="([^"]*)"/);
      const imgs: string[] = [];
      const imgRe = /<img[^>]+src="([^"]+)"/gi; let im: RegExpExecArray | null;
      while ((im = imgRe.exec(inner))) imgs.push(im[1]);
      segs.push({ type: "doc", title: titleMatch?.[1] || "", images: imgs });
      last = m.index + m[0].length;
    }
    if (last < html.length) segs.push({ type: "html", value: html.slice(last) });
    return segs;
  }, [article?.content]);
  const htmlContent = useMemo(() => {
    if (!contentSegments) return article?.content || "";
    return contentSegments.filter((s) => s.type === "html").map((s: any) => s.value).join("");
  }, [contentSegments, article?.content]);

  const eligibilityTarget = toc.find((item) => /eligib|qualification|age limit/i.test(item.text))?.id || "article-content";
  const datesTarget = toc.find((item) => /date|schedule|deadline|important/i.test(item.text))?.id || "article-content";
  const applicationTarget = toc.find((item) => /apply|application|download|check/i.test(item.text))?.id || "article-content";

  if (needsRedirect) return <Navigate to={`/news/${cleanSlug}`} replace />;

  if (!article) {
    if (dbLoading) {
      return (
        <div className="min-h-screen bg-background">
          <SarkariHeader />
          <div className="w-full h-[220px] sm:h-[340px] lg:h-[420px] bg-muted animate-pulse" />
          <div className="container max-w-6xl mx-auto px-4 sm:px-6 mt-6 grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-3/4" />
              <div className="flex items-center gap-3 pt-4 pb-4 border-b border-border">
                <Skeleton className="w-11 h-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/6" />
            </div>
            <div className="lg:col-span-4 hidden lg:block">
              <Skeleton className="h-80 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-background">
        <SarkariHeader />
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Article Not Found</h1>
          <p className="text-muted-foreground mb-6">The article you're looking for doesn't exist.</p>
          <Link to="/news"><Button className="rounded-xl">Browse News</Button></Link>
        </div>
        <SarkariFooter />
      </div>
    );
  }

  const handleShare = async () => {
    try {
      if (navigator.share) await navigator.share({ title: article.title, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }
    } catch {}
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); } catch {}
  };
  const shareTo = (network: "twitter" | "facebook" | "whatsapp" | "linkedin" | "telegram") => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(article.title);
    const map = {
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${text}`,
    };
    window.open(map[network], "_blank", "noopener,noreferrer");
  };

  const toggleListen = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Audio not supported on this device");
      return;
    }
    if (isListening) {
      window.speechSynthesis.cancel();
      setIsListening(false);
      return;
    }
    const text = `${article.title}. ${(article.excerpt || "").slice(0, 600)}`;
    const u = new SpeechSynthesisUtterance(text);
    u.onend = () => setIsListening(false);
    u.onerror = () => setIsListening(false);
    window.speechSynthesis.speak(u);
    setIsListening(true);
  };

  const savedKey = user ? `dc_saved_articles_${user.id}` : "";

  const handleSave = () => {
    if (!user) {
      toast.error("Please sign in to save articles");
      navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    try {
      const list: string[] = JSON.parse(localStorage.getItem(savedKey) || "[]");
      const next = saved ? list.filter((s) => s !== article.slug) : Array.from(new Set([...list, article.slug]));
      localStorage.setItem(savedKey, JSON.stringify(next));
      setSaved(!saved);
      toast.success(saved ? "Removed from your list" : "Saved to your reading list");
    } catch {
      toast.error("Could not save");
    }
  };




  return (
    <div className="min-h-screen bg-background">
      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-[60] bg-transparent">
        <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>

      <SarkariHeader />

      {/* News category nav strip */}
      <div className="bg-card border-b border-border">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
            {NEWS_CATEGORIES.map((c) => (
              <Link key={c.label} to={c.value ? `/news?category=${encodeURIComponent(c.value)}` : "/news"}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${
                  (article?.category || "").toLowerCase().includes(c.value.toLowerCase()) && c.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-primary"
                }`}>
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <main className="sarkari-detail-main" id="content">
        <div className="sarkari-detail-shell">
          <PageBreadcrumb items={[{ label: "Home", href: "/" }, { label: article.category, href: `/?category=${encodeURIComponent(article.category)}` }, { label: article.title }]} />

          <div className="sarkari-detail-layout">
            <article className="sarkari-detail-article">
              <header className="sarkari-detail-hero">
                <div className="sarkari-detail-kickers">
                  <Link to={`/?category=${encodeURIComponent(article.category)}`}>{article.category}</Link>
                  <span><ShieldCheck aria-hidden="true" /> Verify on the official portal</span>
                </div>
                <h1>{article.title}</h1>
                {article.excerpt && <p className="sarkari-detail-excerpt">{article.excerpt}</p>}
                <div className="sarkari-detail-meta">
                  {article.author_id ? (
                    <AuthorByline authorId={article.author_id} fallbackName={article.author} />
                  ) : (
                    <span className="sarkari-detail-author"><i>{(article.author || "SD").split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase()}</i><strong>{article.author}</strong></span>
                  )}
                  <span><Calendar aria-hidden="true" /> {article.publishedAt}</span>
                  <span><Clock aria-hidden="true" /> {article.readTime}</span>
                  {article.views > 0 && <span><Eye aria-hidden="true" /> {article.views >= 1000 ? `${(article.views / 1000).toFixed(1)}K` : article.views}</span>}
                </div>
              </header>

              <section className="sarkari-next-step" aria-labelledby="next-step-title">
                <div><span>Quick actions</span><h2 id="next-step-title">What do you want to check?</h2></div>
                <div className="sarkari-next-step-grid">
                  <button type="button" onClick={() => jumpTo(applicationTarget)}><FileCheck2 /><span><strong>Read notification</strong><small>Application and next steps</small></span><ArrowRight /></button>
                  <button type="button" onClick={() => jumpTo(datesTarget)}><Calendar /><span><strong>Important dates</strong><small>Schedule and deadlines</small></span><ArrowRight /></button>
                  <button type="button" onClick={() => jumpTo(eligibilityTarget)}><CheckCircle2 /><span><strong>Check eligibility</strong><small>Age and qualification</small></span><ArrowRight /></button>
                  <button type="button" onClick={handleSave}><Bookmark className={saved ? "fill-current" : ""} /><span><strong>{saved ? "Saved" : "Save this update"}</strong><small>Keep it for later</small></span><ArrowRight /></button>
                </div>
              </section>

              {article.image && !article.image.includes("placeholder") && (
                <figure className="sarkari-detail-image"><img src={article.image} alt={article.title} fetchPriority="high" decoding="async" /></figure>
              )}

              <motion.section id="article-content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="sarkari-content-card">
                <div className="sarkari-content-heading"><span>Complete update</span><h2>Details, eligibility and next steps</h2></div>
                {article.content?.trim().startsWith("<") ? (
                  contentSegments ? (
                    <>{contentSegments.map((segment, index) => segment.type === "html" ? <RichText key={index} html={segment.value} className="article-prose article-prose--news max-w-none" /> : <DocumentViewer key={index} title={segment.title} images={segment.images} />)}</>
                  ) : <RichText html={htmlContent} className="article-prose article-prose--news max-w-none" />
                ) : (
                  <div className="article-prose article-prose--news max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                      h2: ({ children, ...props }) => <h2 id={slugifyHeading(String(children))} {...props}>{children}</h2>,
                      h3: ({ children, ...props }) => <h3 id={slugifyHeading(String(children))} {...props}>{children}</h3>,
                      table: ({ children, ...props }) => <div className="table-wrap"><table {...props}>{children}</table></div>,
                    }}>{article.content}</ReactMarkdown>
                  </div>
                )}
                <div className="sarkari-official-reminder"><ShieldCheck /><p><strong>Before you act:</strong> confirm every date, vacancy, fee, eligibility rule and download link on the recruiting authority&apos;s official website.</p></div>
                {article.tags.length > 0 && <ArticleTagCloud tags={article.tags} />}
              </motion.section>

              <details className="sarkari-detail-alert-optin">
                <summary><BellRing /><span><strong>Want relevant update alerts?</strong><small>Optional - open the form</small></span><ArrowRight /></summary>
                <LeadCaptureForm variant="inline" simple hideProgramMode title="Request relevant update alerts" subtitle="No application fee is collected by Sarkari DekhoCampus." source={`sarkari_article_after_content_${article.slug}`} interestLabel="Target exam or job" interestOptions={Array.from(new Set([article.category, ...article.tags])).slice(0, 10)} consentPurpose="government job and exam update guidance" successMessage="Your update preferences have been saved." />
              </details>

              <DeferUntilVisible minHeight={120}><div className="mt-8"><DynamicAdBanner variant="horizontal" position="mid-page" page="articles" itemSlug={cleanSlug} /></div></DeferUntilVisible>
              <DeferUntilVisible minHeight={160}><ArticleLinkedResources articleId={(dbArticle as any)?.id} tags={article.tags} /></DeferUntilVisible>

              {recommendations.length > 0 && (
                <section className="sarkari-related" aria-labelledby="related-title">
                  <div className="sarkari-related-heading"><div><span>Continue exploring</span><h2 id="related-title">More {article.category.toLowerCase()} updates</h2><p>Prioritised using the same category and matching topics.</p></div><Link to={`/?category=${encodeURIComponent(article.category)}`}>View all <ArrowRight /></Link></div>
                  <SarkariCarousel ariaLabel={`More ${article.category} updates`} className="sarkari-related-carousel">
                    {recommendations.map((item) => (
                      <Link className="sarkari-related-card" key={item.slug} to={`/news/${item.slug}`}>
                        <div className="sarkari-related-icon">{item.image && !item.image.includes("placeholder") ? <img src={item.image} alt="" loading="lazy" decoding="async" /> : <BriefcaseBusiness />}</div>
                        <div><span>{item.category}</span><h3>{item.title}</h3><p>{item.excerpt}</p><small>{item.readTime}</small></div>
                        <ArrowRight />
                      </Link>
                    ))}
                  </SarkariCarousel>
                </section>
              )}

              <DeferUntilVisible minHeight={300}>
                <div className="sarkari-detail-faq">
                  <FAQSection page="articles" itemSlug={cleanSlug} title="Frequently Asked Questions" fallback={[
                    { question: `What is this article "${article.title}" about?`, answer: article.excerpt || `Read this Sarkari DekhoCampus guide for the latest updates, eligibility, dates and official next steps.` },
                    { question: `Who should read this update?`, answer: `Candidates tracking ${article.category || "government opportunities"}, eligibility, applications or exam next steps may find this update useful.` },
                    { question: `How often is this article updated?`, answer: `Our editorial team reviews articles as new official notifications and dates become available.` },
                    { question: `Where should I verify this update?`, answer: `Always use the official authority or recruitment portal before applying, downloading a document or paying any fee.` },
                  ]} />
                </div>
              </DeferUntilVisible>
            </article>

            <aside className="sarkari-detail-sidebar">
              <div className="sarkari-detail-sidebar-sticky">
                {toc.length > 0 && (
                  <section className="sarkari-toc-card">
                    <span>On this page</span><h2>Jump to a section</h2>
                    <ol>{toc.slice(0, 8).map((heading, index) => <li key={heading.id}><button type="button" onClick={() => jumpTo(heading.id)}><i>{String(index + 1).padStart(2, "0")}</i><span>{heading.text}</span></button></li>)}</ol>
                  </section>
                )}
                <section className="sarkari-side-reminder"><ShieldCheck /><div><h2>Independent information portal</h2><p>We do not conduct recruitment. Use the official authority website for the final notification and payment.</p></div></section>
                <section className="sarkari-side-tools"><h2>Keep or share this update</h2><div><Button variant="outline" onClick={copyLink}><Link2 /> Copy link</Button><Button variant="outline" onClick={handleSave}><Bookmark className={saved ? "fill-current" : ""} /> {saved ? "Saved" : "Save"}</Button><Button variant="outline" onClick={toggleListen}>{isListening ? <Pause /> : <Play />} {isListening ? "Pause" : "Listen"}</Button><Button variant="outline" onClick={() => shareTo("whatsapp")}><Send /> WhatsApp</Button></div></section>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`fixed bottom-24 right-5 z-40 rounded-full bg-primary text-primary-foreground shadow-lg w-11 h-11 flex items-center justify-center transition ${progress > 15 ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        aria-label="Back to top"
      >
        <ArrowUp className="w-5 h-5" />
      </button>

      {/* Floating action dock - Gen Z social bar (mobile/tablet) */}
      <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 lg:hidden transition-all duration-200 ${progress > 18 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20 pointer-events-none"}`}>
        <div className="flex flex-col items-center gap-2">
          {/* TOC mini button - sits ABOVE the dock */}
          {toc.length > 0 && (
            <Sheet open={tocSheetOpen} onOpenChange={setTocSheetOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 bg-card/95 backdrop-blur-md border border-border shadow-lg rounded-full px-3 h-8 text-[11px] font-bold text-foreground hover:border-primary/40 active:scale-95 transition"
                  aria-label="Open table of contents"
                >
                  <List className="w-3.5 h-3.5 text-primary" />
                  Contents · {toc.length}
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl max-h-[70vh] overflow-y-auto">
                <SheetHeader className="text-left">
                  <SheetTitle className="text-base">Table of contents</SheetTitle>
                </SheetHeader>
                <ul className="mt-4 space-y-3 pb-6">
                  {toc.map((h, idx) => (
                    <li key={h.id} className="flex items-start gap-3">
                      <span className="text-[11px] mt-1 font-bold text-muted-foreground/60 tabular-nums w-5 shrink-0">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setTocSheetOpen(false); setTimeout(() => jumpTo(h.id), 100); }}
                        className="text-left text-[14px] font-semibold text-foreground/90 hover:text-primary flex-1"
                      >
                        {h.text}
                      </button>
                    </li>
                  ))}
                </ul>
              </SheetContent>
            </Sheet>
          )}

          <div className="flex items-center gap-1 bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-full pl-2 pr-1 py-1">
            <button
              type="button"
              onClick={handleSave}
              className={`inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full text-[12px] font-bold transition active:scale-95 ${saved ? "bg-primary text-primary-foreground" : "bg-foreground text-background"}`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-current" : ""}`} />
              {saved ? "Saved" : "Save"}
            </button>
            <div className="w-px h-5 bg-border" />
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="w-9 h-9 flex items-center justify-center rounded-full text-foreground/70 hover:text-primary transition" aria-label="Share">
                  <Share2 className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="center" className="w-64 p-3 rounded-2xl">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">Share this article</p>
                <div className="grid grid-cols-3 gap-2">
                  <ShareBtn label="WhatsApp" color="#25D366" onClick={() => shareTo("whatsapp")}>
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.2-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.8-.7-1.4-1.7-1.6-1.9-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.4.1-.2 0-.3 0-.5s-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.7.3-.3.3-.9.9-.9 2.3 0 1.3 1 2.6 1.1 2.8.1.2 1.9 3 4.7 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 4.9L2 22l5.2-1.4c1.4.7 3 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z"/></svg>
                  </ShareBtn>
                  <ShareBtn label="X" color="#000000" onClick={() => shareTo("twitter")}>
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </ShareBtn>
                  <ShareBtn label="LinkedIn" color="#0A66C2" onClick={() => shareTo("linkedin")}>
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 1 1 8.25 6.5 1.75 1.75 0 0 1 6.5 8.25zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0 0 13 14.19a.66.66 0 0 0 0 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 0 1 2.7-1.4c1.55 0 3.36.86 3.36 3.66z"/></svg>
                  </ShareBtn>
                  <ShareBtn label="Facebook" color="#1877F2" onClick={() => shareTo("facebook")}>
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>
                  </ShareBtn>
                  <ShareBtn label="Telegram" color="#229ED9" onClick={() => shareTo("telegram")}>
                    <Send className="w-5 h-5" />
                  </ShareBtn>
                  <ShareBtn label="Copy link" color="hsl(var(--primary))" onClick={copyLink}>
                    <Link2 className="w-5 h-5" />
                  </ShareBtn>
                </div>
                {typeof navigator !== "undefined" && (navigator as any).share && (
                  <button onClick={handleShare} className="mt-3 w-full text-[12px] font-semibold text-primary hover:underline">
                    More options…
                  </button>
                )}
              </PopoverContent>
            </Popover>
            <button type="button" onClick={copyLink} className="w-9 h-9 flex items-center justify-center rounded-full text-foreground/70 hover:text-primary transition" aria-label="Copy link">
              <Link2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>



      <DeferUntilVisible minHeight={200}>
        <div className="container max-w-4xl"><GoogleAd placement="article" position="after-content" pageKey="article" className="my-6" /></div>
        <AlsoCheckSection />
      </DeferUntilVisible>
      <SarkariFooter />
    </div>
  );
}

function ShareBtn({ label, color, onClick, children }: { label: string; color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-muted/50 hover:bg-muted active:scale-95 transition"
    >
      <span className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0" style={{ backgroundColor: color }}>
        {children}
      </span>
      <span className="text-[10px] font-semibold text-foreground/80">{label}</span>
    </button>
  );
}

function ArticleTagCloud({ tags }: { tags: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 4;
  const visible = expanded ? tags : tags.slice(0, LIMIT);
  const hidden = tags.length - LIMIT;
  return (
    <div className="mt-8 pt-6 border-t border-border">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tagged in</p>
        <span className="text-[11px] text-muted-foreground">{tags.length} topics</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((tag) => (
          <Link key={tag} to={`/news/tag/${encodeURIComponent(tag)}`}>
            <Badge variant="outline" className="text-[11px] font-medium px-2 py-0.5 rounded-full hover:bg-primary hover:text-primary-foreground hover:border-primary transition">
              <Tag className="w-2.5 h-2.5 mr-1 opacity-60" />{tag}
            </Badge>
          </Link>
        ))}
        {hidden > 0 && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="text-[11px] font-semibold text-primary px-2 py-0.5 rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/10 transition"
          >
            +{hidden} more
          </button>
        )}
        {expanded && tags.length > LIMIT && (
          <button
            onClick={() => setExpanded(false)}
            className="text-[11px] font-semibold text-muted-foreground px-2 py-0.5 rounded-full border border-border hover:bg-muted transition"
          >
            Show less
          </button>
        )}
      </div>
    </div>
  );
}
