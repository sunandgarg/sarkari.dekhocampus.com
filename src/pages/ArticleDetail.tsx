import { useParams, Link, Navigate } from "react-router-dom";
import { Fragment, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUp, BellRing, Bookmark, Calendar, Clock, Eye, Link2, List, Pause, Play, Send, Share2, ShieldCheck, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SarkariHeader } from "@/components/sarkari/SarkariHeader";
import { SarkariFooter } from "@/components/sarkari/SarkariFooter";
import { SarkariAdSlot } from "@/components/sarkari/SarkariAdSlot";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { Skeleton } from "@/components/ui/skeleton";
import { DeferUntilVisible } from "@/components/DeferUntilVisible";
import { useDbArticle, useRelatedSarkariArticles } from "@/hooks/useArticlesData";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useSEO } from "@/hooks/useSEO";
import { DocumentViewer } from "@/components/detail/DocumentViewer";
import { RichText } from "@/components/detail/RichText";
import { absoluteCanonical, absoluteSiteUrl, SITE_CONFIG } from "@/lib/constant";
import { lazyRetry } from "@/lib/lazyRetry";
import { stripVisibleArticleSources } from "@/lib/articleContentSanitizer";
import { SARKARI_FAQ_PAGE } from "@/lib/siteScope";
import { getArticleLoadState } from "@/lib/articleLoadState";

// Heavy below-the-fold components - lazy loaded for faster initial paint
const FAQSection = lazyRetry(() => import("@/components/FAQSection").then(m => ({ default: m.FAQSection })), "FAQSection");

const SAVED_ARTICLES_KEY = "sarkari_saved_articles_v1";

function slugifyHeading(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80);
}
function normalizeSlug(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

type ArticleAdPosition = "after-overview" | "after-selection" | "after-important-dates" | "after-important-links";
type ArticleContentSegment =
  | { type: "html"; value: string }
  | { type: "doc"; title: string; images: string[] };
type AdAwareArticleContentSegment =
  | { type: "html"; value: string; adPosition?: ArticleAdPosition }
  | { type: "doc"; title: string; images: string[] };

function articleAdPlacementClass(position: ArticleAdPosition) {
  return `sarkari-ad-placement sarkari-ad-placement--${position === "after-important-links" ? "rectangle" : "wide"}`;
}

function adPositionAfterHeading(heading: string): ArticleAdPosition | undefined {
  const normalized = heading.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim().toLowerCase();
  if (/\boverview\b/.test(normalized)) return "after-overview";
  if (/\bselection(?: procedure| process)?\b/.test(normalized)) return "after-selection";
  if (/\bimportant dates?\b/.test(normalized)) return "after-important-dates";
  if (/\bimportant links?\b|\bofficial links?\b/.test(normalized)) return "after-important-links";
  return undefined;
}

function splitHtmlForAds(value: string) {
  const headings = Array.from(value.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi));
  if (!headings.length) return [{ value }];
  const sections: Array<{ value: string; adPosition?: ArticleAdPosition }> = [];
  const firstIndex = headings[0].index ?? 0;
  if (firstIndex > 0) sections.push({ value: value.slice(0, firstIndex) });
  headings.forEach((heading, index) => {
    const start = heading.index ?? 0;
    const end = headings[index + 1]?.index ?? value.length;
    sections.push({ value: value.slice(start, end), adPosition: adPositionAfterHeading(heading[1]) });
  });
  return sections;
}

function splitMarkdownForAds(value: string) {
  const headings = Array.from(value.matchAll(/^##\s+(.+?)\s*$/gm));
  if (!headings.length) return [{ value }];
  const sections: Array<{ value: string; adPosition?: ArticleAdPosition }> = [];
  const firstIndex = headings[0].index ?? 0;
  if (firstIndex > 0) sections.push({ value: value.slice(0, firstIndex) });
  headings.forEach((heading, index) => {
    const start = heading.index ?? 0;
    const end = headings[index + 1]?.index ?? value.length;
    sections.push({ value: value.slice(start, end), adPosition: adPositionAfterHeading(heading[1]) });
  });
  return sections;
}

export default function ArticleDetail() {
  const { slug: rawSlug } = useParams<{ slug: string }>();
  let decoded = rawSlug || "";
  try { decoded = decodeURIComponent(decoded); } catch { /* malformed routes resolve to not found */ }
  const cleanSlug = normalizeSlug(decoded);
  const needsRedirect = !!(rawSlug && cleanSlug && cleanSlug !== rawSlug && cleanSlug !== decoded);

  const { data: dbArticle, isLoading: dbLoading, isError: dbError, refetch: refetchArticle } = useDbArticle(cleanSlug || rawSlug);
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
        updatedAt: new Date(dbArticle.updated_at || dbArticle.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        views: dbArticle.views ?? 0,
        tags: dbArticle.tags || [],
      };
    }
    return null;
  }, [dbArticle]);
  const { data: relatedDbArticles = [] } = useRelatedSarkariArticles(article?.category, article?.tags || [], article?.slug);

  const [progress, setProgress] = useState(0);
  const [tocSheetOpen, setTocSheetOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [saved, setSaved] = useState(false);
  const reduceMotion = useReducedMotion();
  const seoImage = article?.image && !article.image.includes("placeholder")
    ? article.image
    : SITE_CONFIG.ogImagePath;
  const usesBrandSeoImage = seoImage === SITE_CONFIG.ogImagePath;
  const articleLoadState = getArticleLoadState(Boolean(article), dbLoading, dbError);
  useSEO({
    enabled: articleLoadState === "ready" || articleLoadState === "not-found",
    title: article ? article.title : "Article",
    description: article?.excerpt || "Read the latest education and career articles.",
    canonical: article ? `/news/${article.slug}` : undefined,
    ogImage: seoImage,
    ogImageAlt: usesBrandSeoImage ? "Sarkari DekhoCampus DC logo" : article?.title,
    ogType: "article",
    twitterCard: usesBrandSeoImage ? "summary" : "summary_large_image",
    noIndex: articleLoadState === "not-found",
    jsonLd: article ? {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: article.title,
      description: article.excerpt || undefined,
      image: [absoluteCanonical(seoImage)],
      datePublished: dbArticle?.created_at || undefined,
      dateModified: dbArticle?.updated_at || dbArticle?.created_at || undefined,
      author: { "@type": "Person", name: article.author || "Sarkari DekhoCampus Desk" },
      publisher: {
        "@type": "Organization",
        name: "Sarkari DekhoCampus",
        logo: {
          "@type": "ImageObject",
          url: absoluteSiteUrl(SITE_CONFIG.ogImagePath),
          width: 512,
          height: 512,
        },
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

  // Saving is intentionally browser-local; authentication and admin live only
  // on the main DekhoCampus application.
  useEffect(() => {
    if (!article) { setSaved(false); return; }
    try {
      const list: string[] = JSON.parse(localStorage.getItem(SAVED_ARTICLES_KEY) || "[]");
      setSaved(list.includes(article.slug));
    } catch { setSaved(false); }
  }, [article]);


  const recommendations = useMemo(() => {
    if (!article) return [];
    return relatedDbArticles.map((item) => ({
      slug: item.slug,
      title: item.title,
      excerpt: item.description || "Read the latest eligibility, dates and official next steps.",
      category: item.category || item.vertical || "Latest Jobs",
      image: item.featured_image || "/placeholder.svg",
      readTime: "Latest update",
      publishedAt: new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      tags: item.tags || [],
    }));
  }, [article, relatedDbArticles]);

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
    window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
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
    const segs: ArticleContentSegment[] = [];
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
  const adAwareContentSegments = useMemo(() => {
    if (!contentSegments) return null;
    return contentSegments.flatMap<AdAwareArticleContentSegment>((segment) => segment.type === "html"
      ? splitHtmlForAds(segment.value).map((part): AdAwareArticleContentSegment => ({ type: "html", ...part }))
      : [segment]);
  }, [contentSegments]);
  const markdownAdSections = useMemo(
    () => article?.content && !article.content.trim().startsWith("<") ? splitMarkdownForAds(article.content) : [],
    [article?.content],
  );

  if (needsRedirect) return <Navigate to={`/news/${cleanSlug}`} replace />;

  if (!article) {
    if (articleLoadState === "loading") {
      return (
        <div className="sarkari-site min-h-screen bg-background">
          <a className="sarkari-skip-link" href="#content">Skip to main content</a>
          <SarkariHeader />
          <main className="sarkari-detail-main" id="content">
            <div className="sarkari-detail-shell">
              <article className="sarkari-job-article space-y-4" aria-label="Loading job update">
                <header className="sarkari-job-header space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-3/4" />
                  <div className="flex flex-wrap gap-3 border-l-4 border-primary bg-muted p-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                </header>
                <div className="sarkari-job-content space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-8 w-64 mt-8" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              </article>
            </div>
          </main>
          <SarkariFooter />
        </div>
      );
    }
    if (articleLoadState === "unavailable") {
      return (
        <div className="sarkari-site min-h-screen bg-background">
          <a className="sarkari-skip-link" href="#content">Skip to main content</a>
          <SarkariHeader />
          <main className="sarkari-detail-main" id="content">
            <div className="sarkari-detail-shell text-center" role="alert">
              <h1 className="mb-2 text-2xl font-bold text-foreground">This update is temporarily unavailable</h1>
              <p className="mb-6 text-muted-foreground">We could not reach the update service. Please retry in a moment.</p>
              <Button className="min-h-11 rounded-md" onClick={() => void refetchArticle()}>Retry</Button>
            </div>
          </main>
          <SarkariFooter />
        </div>
      );
    }
    return (
      <div className="sarkari-site min-h-screen bg-background">
        <a className="sarkari-skip-link" href="#content">Skip to main content</a>
        <SarkariHeader />
        <main className="sarkari-detail-main" id="content">
          <div className="sarkari-detail-shell text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Article Not Found</h1>
            <p className="text-muted-foreground mb-6">The article you're looking for doesn't exist.</p>
            <Link className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" to="/">Browse News</Link>
          </div>
        </main>
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

  const handleSave = () => {
    try {
      const list: string[] = JSON.parse(localStorage.getItem(SAVED_ARTICLES_KEY) || "[]");
      const next = saved ? list.filter((s) => s !== article.slug) : Array.from(new Set([...list, article.slug]));
      localStorage.setItem(SAVED_ARTICLES_KEY, JSON.stringify(next));
      setSaved(!saved);
      toast.success(saved ? "Removed from your list" : "Saved to your reading list");
    } catch {
      toast.error("Could not save");
    }
  };




  return (
    <div className="sarkari-site min-h-screen bg-background">
      <a className="sarkari-skip-link" href="#content">Skip to main content</a>
      <Sonner />
      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-[60] bg-transparent">
        <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>

      <SarkariHeader />

      <main className="sarkari-detail-main" id="content">
        <div className="sarkari-detail-shell">
          <div className="sarkari-detail-layout sarkari-job-layout">
            <article className="sarkari-detail-article sarkari-job-article">
              <header className="sarkari-detail-hero sarkari-job-header">
                <h1>{article.title}</h1>
                <div className="sarkari-detail-meta sarkari-job-meta" aria-label="Article information">
                  <span><Calendar aria-hidden="true" /><strong className="sarkari-job-meta-label">Last Updated:</strong> <time dateTime={dbArticle?.updated_at || dbArticle?.created_at}>{article.updatedAt}</time></span>
                  <span><Tag aria-hidden="true" /><strong className="sarkari-job-meta-label">Category:</strong> <Link to={`/?category=${encodeURIComponent(article.category)}`}>{article.category}</Link></span>
                  <span><Clock aria-hidden="true" /><strong className="sarkari-job-meta-label">Read Time:</strong> {article.readTime}</span>
                  <span><strong className="sarkari-job-meta-label">Published By:</strong> {article.author}</span>
                  {article.views > 0 && <span><Eye aria-hidden="true" /><strong className="sarkari-job-meta-label">Views:</strong> {article.views >= 1000 ? `${(article.views / 1000).toFixed(1)}K` : article.views}</span>}
                </div>
                {article.excerpt && <p className="sarkari-detail-excerpt sarkari-job-excerpt">{article.excerpt}</p>}
                <div className="sarkari-job-actions" role="group" aria-label="Article actions">
                  <Button variant="outline" size="sm" className="sarkari-job-action" onClick={handleSave}><Bookmark className={saved ? "fill-current" : ""} /> {saved ? "Saved" : "Save"}</Button>
                  <Button variant="outline" size="sm" className="sarkari-job-action" onClick={toggleListen}>{isListening ? <Pause /> : <Play />} {isListening ? "Pause" : "Listen"}</Button>
                  <Button variant="outline" size="sm" className="sarkari-job-action" onClick={handleShare}><Share2 /> Share</Button>
                </div>
              </header>

              {article.image && !article.image.includes("placeholder") && (
                <figure className="sarkari-detail-image sarkari-job-image"><img src={article.image} alt={article.title} width="1200" height="675" fetchPriority="high" decoding="async" /></figure>
              )}

              <SarkariAdSlot placement="article" position="after-intro" pageKey="article" category={article.category} className="sarkari-ad-placement sarkari-ad-placement--rectangle" />

              <motion.section id="article-content" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.24 }} className="sarkari-content-card sarkari-job-content">
                {article.content?.trim().startsWith("<") ? (
                  adAwareContentSegments ? (
                    <>{adAwareContentSegments.map((segment, index) => segment.type === "html" ? (
                      <Fragment key={index}>
                        <RichText html={segment.value} className="article-prose article-prose--news max-w-none" />
                        {segment.adPosition && <SarkariAdSlot placement="article" position={segment.adPosition} pageKey="article" category={article.category} className={articleAdPlacementClass(segment.adPosition)} />}
                      </Fragment>
                    ) : <DocumentViewer key={index} title={segment.title} images={segment.images} />)}</>
                  ) : <RichText html={htmlContent} className="article-prose article-prose--news max-w-none" />
                ) : (
                  <>{markdownAdSections.map((section, index) => (
                    <Fragment key={index}>
                      <div className="article-prose article-prose--news max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                          h2: ({ children, ...props }) => <h2 id={slugifyHeading(String(children))} {...props}>{children}</h2>,
                          h3: ({ children, ...props }) => <h3 id={slugifyHeading(String(children))} {...props}>{children}</h3>,
                          table: ({ children, ...props }) => <div className="table-wrap" role="region" aria-label="Scrollable article table" tabIndex={0}><table {...props}>{children}</table></div>,
                        }}>{section.value}</ReactMarkdown>
                      </div>
                      {section.adPosition && <SarkariAdSlot placement="article" position={section.adPosition} pageKey="article" category={article.category} className={articleAdPlacementClass(section.adPosition)} />}
                    </Fragment>
                  ))}</>
                )}
                <div className="sarkari-official-reminder"><ShieldCheck /><p><strong>Before you act:</strong> confirm every date, vacancy, fee, eligibility rule and download link on the recruiting authority&apos;s official website.</p></div>
                {article.tags.length > 0 && <ArticleTagCloud tags={article.tags} />}
              </motion.section>

              <details className="sarkari-detail-alert-optin">
                <summary><BellRing /><span><strong>Want relevant update alerts?</strong><small>Optional - open the form</small></span><ArrowRight /></summary>
                <LeadCaptureForm variant="inline" simple hideProgramMode title="Request relevant update alerts" subtitle="No application fee is collected by Sarkari DekhoCampus." source={`sarkari_article_after_content_${article.slug}`} interestLabel="Target exam or job" interestOptions={Array.from(new Set([article.category, ...article.tags])).slice(0, 10)} consentPurpose="government job and exam update guidance" successMessage="Your update preferences have been saved." />
              </details>

              <DeferUntilVisible minHeight={300}>
                <div className="sarkari-detail-faq">
                  <FAQSection page={SARKARI_FAQ_PAGE} itemSlug={cleanSlug} title="Frequently Asked Questions" fallback={[
                    { question: `What is this article "${article.title}" about?`, answer: article.excerpt || `Read this Sarkari DekhoCampus guide for the latest updates, eligibility, dates and official next steps.` },
                    { question: `Who should read this update?`, answer: `Candidates tracking ${article.category || "government opportunities"}, eligibility, applications or exam next steps may find this update useful.` },
                    { question: `How often is this article updated?`, answer: `Our editorial team reviews articles as new official notifications and dates become available.` },
                    { question: `Where should I verify this update?`, answer: `Always use the official authority or recruitment portal before applying, downloading a document or paying any fee.` },
                  ]} />
                </div>
              </DeferUntilVisible>
              <SarkariAdSlot placement="article" position="before-related" pageKey="article" category={article.category} className="sarkari-ad-placement sarkari-ad-placement--wide" />
              {recommendations.length > 0 && (
                <section className="sarkari-related sarkari-job-related" aria-labelledby="related-title">
                  <div className="sarkari-related-heading sarkari-job-related-heading"><div><span>Continue exploring</span><h2 id="related-title">More {article.category.toLowerCase()} updates</h2></div><Link to={`/?category=${encodeURIComponent(article.category)}`}>View all <ArrowRight /></Link></div>
                  <ol className="sarkari-related-list sarkari-job-related-list" aria-label={`More ${article.category} updates`}>
                    {recommendations.map((item, index) => (
                      <li key={item.slug}>
                        <Link className="sarkari-related-card sarkari-job-related-item" to={`/news/${item.slug}`}>
                          <span className="sarkari-job-related-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                          <div><span>{item.category}</span><h3>{item.title}</h3><small>{item.publishedAt}</small></div>
                          <ArrowRight aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </article>
          </div>
        </div>
      </main>

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" })}
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
                  className="inline-flex items-center gap-1.5 bg-card/95 backdrop-blur-md border border-border shadow-lg rounded-full px-3 h-11 text-[11px] font-bold text-foreground hover:border-primary/40 active:scale-95 transition"
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
                      <span className="text-[11px] mt-1 font-bold text-muted-foreground tabular-nums w-5 shrink-0">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setTocSheetOpen(false); setTimeout(() => jumpTo(h.id), 100); }}
                        className="min-h-11 text-left text-[14px] font-semibold text-foreground/90 hover:text-primary flex-1"
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
              className={`inline-flex items-center gap-1.5 px-3.5 h-11 rounded-full text-[12px] font-bold transition active:scale-95 ${saved ? "bg-primary text-primary-foreground" : "bg-foreground text-background"}`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-current" : ""}`} />
              {saved ? "Saved" : "Save"}
            </button>
            <div className="w-px h-5 bg-border" />
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="w-11 h-11 flex items-center justify-center rounded-full text-foreground/70 hover:text-primary transition" aria-label="Share">
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
                  <button onClick={handleShare} className="mt-3 min-h-11 w-full text-[12px] font-semibold text-primary hover:underline">
                    More options…
                  </button>
                )}
              </PopoverContent>
            </Popover>
            <button type="button" onClick={copyLink} className="w-11 h-11 flex items-center justify-center rounded-full text-foreground/70 hover:text-primary transition" aria-label="Copy link">
              <Link2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      <SarkariFooter />
    </div>
  );
}

function ShareBtn({ label, color, onClick, children }: { label: string; color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-muted/50 hover:bg-muted active:scale-95 transition"
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
          <Link key={tag} className="min-h-11 inline-flex items-center" to={`/news/tag/${encodeURIComponent(tag)}`}>
            <Badge variant="outline" className="text-[11px] font-medium px-2 py-0.5 rounded-full hover:bg-primary hover:text-primary-foreground hover:border-primary transition">
              <Tag className="w-2.5 h-2.5 mr-1 opacity-60" />{tag}
            </Badge>
          </Link>
        ))}
        {hidden > 0 && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="min-h-11 text-[11px] font-semibold text-primary px-2 py-0.5 rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/10 transition"
          >
            +{hidden} more
          </button>
        )}
        {expanded && tags.length > LIMIT && (
          <button
            onClick={() => setExpanded(false)}
            className="min-h-11 text-[11px] font-semibold text-muted-foreground px-2 py-0.5 rounded-full border border-border hover:bg-muted transition"
          >
            Show less
          </button>
        )}
      </div>
    </div>
  );
}
