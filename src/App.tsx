import { Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChunkErrorBoundary } from "@/components/ChunkErrorBoundary";
import { ScrollLockGuard } from "@/components/ScrollLockGuard";
import { ScrollToTop } from "@/components/ScrollToTop";
import { OptionalIntegrationBoundary } from "@/components/OptionalIntegrationBoundary";
import { SITE_URL } from "@/lib/constant";
import { lazyRetry } from "@/lib/lazyRetry";
import Index from "./pages/Index";

const ArticleDetail = lazyRetry(() => import("./pages/ArticleDetail"), "ArticleDetail");
const SarkariNotFound = lazyRetry(() => import("./pages/SarkariNotFound"), "SarkariNotFound");
const SiteIntegrations = lazyRetry(() => import("@/components/SiteIntegrations").then((module) => ({ default: module.SiteIntegrations })), "SiteIntegrations");
const AdsenseLoader = lazyRetry(() => import("@/components/ads/AdsenseLoader").then((module) => ({ default: module.AdsenseLoader })), "AdsenseLoader");
const CookieConsent = lazyRetry(() => import("@/components/CookieConsent").then((module) => ({ default: module.CookieConsent })), "CookieConsent");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000, retry: 1, refetchOnWindowFocus: false },
  },
});

function LegacyArticleRoute() {
  const { slug } = useParams<{ slug?: string }>();
  return <Navigate to={slug ? `/news/${slug}` : "/"} replace />;
}

function NewsArchiveRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/${search}`} replace />;
}

function RouteSeoPolicy() {
  const { pathname } = useLocation();
  useEffect(() => {
    const knownPublicRoute = pathname === "/" || pathname === "/news" || pathname.startsWith("/news/") || pathname.startsWith("/articles");
    const privateRoute = pathname.startsWith("/admin") || pathname === "/auth" || !knownPublicRoute;
    let robots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = privateRoute ? "noindex, nofollow, noarchive" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `${SITE_URL}${pathname.replace(/\/+$/, "") || "/"}`;
  }, [pathname]);
  return null;
}

function PageLoader() {
  return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <OptionalIntegrationBoundary name="cookie-consent">
            <Suspense fallback={null}><CookieConsent /></Suspense>
          </OptionalIntegrationBoundary>
          <OptionalIntegrationBoundary name="site-integrations">
            <Suspense fallback={null}><SiteIntegrations /></Suspense>
          </OptionalIntegrationBoundary>
          <OptionalIntegrationBoundary name="adsense">
            <Suspense fallback={null}><AdsenseLoader /></Suspense>
          </OptionalIntegrationBoundary>
          <ScrollToTop />
          <ScrollLockGuard />
          <RouteSeoPolicy />
          <ChunkErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/news" element={<NewsArchiveRedirect />} />
                <Route path="/news/tag/:tag" element={<Index />} />
                <Route path="/news/:slug" element={<ArticleDetail />} />
                <Route path="/articles" element={<LegacyArticleRoute />} />
                <Route path="/articles/:slug" element={<LegacyArticleRoute />} />
                <Route path="*" element={<SarkariNotFound />} />
              </Routes>
            </Suspense>
          </ChunkErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
