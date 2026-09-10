import { Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminActionGuard } from "@/components/AdminActionGuard";
import { ChunkErrorBoundary } from "@/components/ChunkErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ScrollLockGuard } from "@/components/ScrollLockGuard";
import { ScrollToTop } from "@/components/ScrollToTop";
import { AuthProvider } from "@/hooks/useAuth";
import { hydrateBootstrap } from "@/lib/bootstrap";
import { SITE_URL } from "@/lib/constant";
import { lazyRetry } from "@/lib/lazyRetry";
import Index from "./pages/Index";

const ArticleDetail = lazyRetry(() => import("./pages/ArticleDetail"), "ArticleDetail");
const Auth = lazyRetry(() => import("./pages/Auth"), "Auth");
const AdminArticles = lazyRetry(() => import("./pages/AdminArticles"), "AdminArticles");
const AdminArticleCategories = lazyRetry(() => import("./pages/AdminArticleCategories"), "AdminArticleCategories");
const AdminTagsManager = lazyRetry(() => import("./pages/AdminTagsManager"), "AdminTagsManager");
const AdminAuthors = lazyRetry(() => import("./pages/AdminAuthors"), "AdminAuthors");
const AdminAIProviders = lazyRetry(() => import("./pages/AdminAIProviders"), "AdminAIProviders");
const AdminAIReports = lazyRetry(() => import("./pages/AdminAIReports"), "AdminAIReports");
const AdminIntegrations = lazyRetry(() => import("./pages/AdminIntegrations"), "AdminIntegrations");
const SarkariNotFound = lazyRetry(() => import("./pages/SarkariNotFound"), "SarkariNotFound");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000, retry: 1, refetchOnWindowFocus: false },
  },
});

function LegacyArticleRoute() {
  const { slug } = useParams<{ slug?: string }>();
  return <Navigate to={slug ? `/news/${slug}` : "/"} replace />;
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

function BootstrapHydrator() {
  useEffect(() => { hydrateBootstrap(queryClient); }, []);
  return null;
}

function PageLoader() {
  return <div className="min-h-screen bg-white flex items-center justify-center"><div className="w-8 h-8 border-3 border-red-800 border-t-transparent rounded-full animate-spin" /></div>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BootstrapHydrator />
      <AuthProvider>
        <AdminActionGuard />
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <ScrollLockGuard />
            <RouteSeoPolicy />
            <ChunkErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/news" element={<Index />} />
                  <Route path="/news/tag/:tag" element={<Index />} />
                  <Route path="/news/:slug" element={<ArticleDetail />} />
                  <Route path="/articles" element={<LegacyArticleRoute />} />
                  <Route path="/articles/:slug" element={<LegacyArticleRoute />} />
                  <Route path="/auth" element={<Auth />} />

                  <Route path="/admin" element={<ProtectedRoute module="articles"><Navigate to="/admin/articles" replace /></ProtectedRoute>} />
                  <Route path="/admin/articles" element={<ProtectedRoute module="articles"><AdminArticles /></ProtectedRoute>} />
                  <Route path="/admin/article-categories" element={<ProtectedRoute module="articles"><AdminArticleCategories /></ProtectedRoute>} />
                  <Route path="/admin/tags" element={<ProtectedRoute module="articles"><AdminTagsManager /></ProtectedRoute>} />
                  <Route path="/admin/authors" element={<ProtectedRoute module="authors"><AdminAuthors /></ProtectedRoute>} />
                  <Route path="/admin/ai-providers" element={<ProtectedRoute requireAdmin><AdminAIProviders /></ProtectedRoute>} />
                  <Route path="/admin/ai-reports" element={<ProtectedRoute requireAdmin><AdminAIReports /></ProtectedRoute>} />
                  <Route path="/admin/integrations" element={<ProtectedRoute requireAdmin><AdminIntegrations /></ProtectedRoute>} />
                  <Route path="/admin/*" element={<Navigate to="/admin/articles" replace />} />
                  <Route path="*" element={<SarkariNotFound />} />
                </Routes>
              </Suspense>
            </ChunkErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
