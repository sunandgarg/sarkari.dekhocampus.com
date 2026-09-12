import { useEffect } from "react";
import { absoluteCanonical } from "@/lib/constant";

interface SEOProps {
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
}

/** Lightweight SEO updater - no extra deps. Sets document.title + meta tags + OG/Twitter + JSON-LD. */
export function SEO({
  title,
  description,
  keywords,
  canonical,
  ogImage,
  ogImageAlt,
  ogType = "website",
  twitterCard = "summary_large_image",
  jsonLd,
  noIndex = false,
}: SEOProps) {
  const jsonLdText = JSON.stringify(jsonLd ?? null);

  useEffect(() => {
    const canonicalUrl = absoluteCanonical(canonical || window.location.pathname);
    const ogImageUrl = absoluteCanonical(ogImage);
    if (title) document.title = title;

    const setNameMeta = (name: string, content?: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!content) {
        el?.remove();
        return;
      }
      if (!el) {
        el = document.createElement("meta");
        el.name = name;
        document.head.appendChild(el);
      }
      el.content = content;
    };

    const setPropMeta = (property: string, content?: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!content) {
        el?.remove();
        return;
      }
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    setNameMeta("description", description);
    setNameMeta("keywords", keywords);
    setNameMeta("robots", noIndex
      ? "noindex, nofollow, noarchive"
      : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");

    if (canonicalUrl) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = canonicalUrl;
    }

    // OpenGraph
    setPropMeta("og:title", title);
    setPropMeta("og:description", description);
    setPropMeta("og:url", canonicalUrl);
    setPropMeta("og:type", ogType);
    setPropMeta("og:image", ogImageUrl);
    setPropMeta("og:image:alt", ogImageAlt);

    // Twitter
    setNameMeta("twitter:card", twitterCard);
    setNameMeta("twitter:title", title);
    setNameMeta("twitter:description", description);
    setNameMeta("twitter:url", canonicalUrl);
    setNameMeta("twitter:image", ogImageUrl);
    setNameMeta("twitter:image:alt", ogImageAlt);

    // JSON-LD
    const id = "ld-json-page";
    const nonce = document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce || "";
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    if (jsonLdText !== "null") {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = id;
      script.text = jsonLdText;
      if (nonce) script.nonce = nonce;
      document.head.appendChild(script);
    }
  }, [title, description, keywords, canonical, ogImage, ogImageAlt, ogType, twitterCard, jsonLdText, noIndex]);
  return null;
}
