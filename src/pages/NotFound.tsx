import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useSEO } from "@/hooks/useSEO";

const NotFound = () => {
  const location = useLocation();
  useSEO({ title: "Page Not Found", description: "The requested DekhoCampus page could not be found.", canonical: location.pathname });

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    const robots = document.querySelector('meta[name="robots"]') || document.head.appendChild(document.createElement("meta"));
    robots.setAttribute("name", "robots");
    robots.setAttribute("content", "noindex, nofollow");
    return () => robots.setAttribute("content", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
