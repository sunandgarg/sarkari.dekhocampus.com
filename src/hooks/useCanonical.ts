import { SITE_URL } from "@/lib/constant";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Sets a canonical URL link tag in <head> based on current route.
 * Removes trailing slashes. Filter pages can opt in to a stable query string
 * so indexable filter combinations do not canonicalise back to the listing.
 */
export function useCanonical(baseUrl = SITE_URL, includeSearch = false) {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const query = includeSearch ? search : "";
    const canonical = `${baseUrl}${pathname.replace(/\/+$/, "") || "/"}${query}`;
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", canonical);

    return () => {
      link?.remove();
    };
  }, [pathname, search, baseUrl, includeSearch]);
}
