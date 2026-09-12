import { useEffect } from "react";
import { absoluteCanonical } from "@/lib/constant";

type SEOOptions = {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  ogImageAlt?: string;
  ogType?: string;
  twitterCard?: string;
  jsonLd?: object | object[];
  noIndex?: boolean;
  enabled?: boolean;
};

export function useSEO({
  title,
  description,
  keywords,
  canonical,
  ogImage,
  ogImageAlt,
  ogType = "website",
  twitterCard,
  jsonLd,
  noIndex = false,
  enabled = true,
}: SEOOptions) {
  const jsonLdKey = JSON.stringify(jsonLd ?? null);

  useEffect(() => {
    if (!enabled) return;
    if (title) {
      document.title = title.includes("DekhoCampus") ? title : `${title} | Sarkari DekhoCampus`;
    }

    const setNameMeta = (name: string, content?: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!content) {
        meta?.remove();
        return;
      }
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", name);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    const setPropertyMeta = (property: string, content?: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!content) {
        meta?.remove();
        return;
      }
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("property", property);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    const canonicalUrl = absoluteCanonical(canonical || window.location.pathname);
    const imageUrl = absoluteCanonical(ogImage);
    setNameMeta("description", description);
    setNameMeta("keywords", keywords);
    setNameMeta("robots", noIndex
      ? "noindex, nofollow, noarchive"
      : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
    setNameMeta("twitter:card", twitterCard || (imageUrl ? "summary_large_image" : "summary"));
    setNameMeta("twitter:title", title);
    setNameMeta("twitter:description", description);
    setNameMeta("twitter:url", canonicalUrl);
    setNameMeta("twitter:image", imageUrl);
    setNameMeta("twitter:image:alt", ogImageAlt);
    setPropertyMeta("og:title", title);
    setPropertyMeta("og:description", description);
    setPropertyMeta("og:url", canonicalUrl);
    setPropertyMeta("og:type", ogType);
    setPropertyMeta("og:image", imageUrl);
    setPropertyMeta("og:image:alt", ogImageAlt);

    if (canonicalUrl) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = canonicalUrl;
    }

    const nonce = document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce || "";
    document.getElementById("ld-json-page")?.remove();
    if (jsonLdKey !== "null") {
      const script = document.createElement("script");
      script.id = "ld-json-page";
      script.type = "application/ld+json";
      script.text = jsonLdKey;
      if (nonce) script.nonce = nonce;
      document.head.appendChild(script);
    }

    return () => {
      document.title = "Sarkari DekhoCampus - Latest Jobs, Results & Admit Cards";
    };
  }, [title, description, keywords, canonical, ogImage, ogImageAlt, ogType, twitterCard, jsonLdKey, noIndex, enabled]);
}
