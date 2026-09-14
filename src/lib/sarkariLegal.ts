import { SITE_CONFIG, SITE_URL } from "./constant";

export const SARKARI_LEGAL_LAST_UPDATED = "14 September 2026";
export const SARKARI_LEGAL_LAST_UPDATED_ISO = "2026-09-14";
export const SARKARI_LEGAL_SHELL_PREFIX = "/__sarkari_legal_";

export const SARKARI_LEGAL_PAGES = [
  {
    slug: "privacy-policy",
    path: "/legal/privacy-policy",
    shortTitle: "Privacy",
    title: "Privacy Policy",
    description: "How Sarkari DekhoCampus collects, uses, shares and protects personal information.",
  },
  {
    slug: "cookie-policy",
    path: "/legal/cookie-policy",
    shortTitle: "Cookies",
    title: "Cookie Policy",
    description: "How Sarkari DekhoCampus uses cookies, local storage, analytics and advertising technologies.",
  },
  {
    slug: "terms-of-service",
    path: "/legal/terms-of-service",
    shortTitle: "Terms",
    title: "Terms of Use",
    description: "The terms that apply when you browse or use Sarkari DekhoCampus.",
  },
  {
    slug: "disclaimer",
    path: "/legal/disclaimer",
    shortTitle: "Disclaimer",
    title: "Independence and Information Disclaimer",
    description: "Important limits and verification requirements for government job and examination information.",
  },
  {
    slug: "editorial-corrections",
    path: "/legal/editorial-corrections",
    shortTitle: "Corrections",
    title: "Editorial, Corrections and Takedown Policy",
    description: "Our sourcing, verification, corrections, complaints and takedown standards.",
  },
] as const;

export type SarkariLegalPage = (typeof SARKARI_LEGAL_PAGES)[number];
export type SarkariLegalSlug = SarkariLegalPage["slug"];

const SARKARI_LEGAL_PAGE_BY_SLUG = new Map<SarkariLegalSlug, SarkariLegalPage>(
  SARKARI_LEGAL_PAGES.map((page) => [page.slug, page]),
);

export function getSarkariLegalPage(slug: SarkariLegalSlug): SarkariLegalPage {
  return SARKARI_LEGAL_PAGE_BY_SLUG.get(slug)!;
}

export function isSarkariLegalPath(pathname: string) {
  return SARKARI_LEGAL_PAGES.some((page) => page.path === pathname.replace(/\/+$/, ""));
}

export function getSarkariLegalJsonLd(page: SarkariLegalPage) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.title,
    description: page.description,
    url: `${SITE_URL}${page.path}`,
    dateModified: SARKARI_LEGAL_LAST_UPDATED_ISO,
    isPartOf: { "@type": "WebSite", name: SITE_CONFIG.name, url: SITE_URL },
  };
}

export function sarkariLegalShellPath(slug: SarkariLegalSlug) {
  return `${SARKARI_LEGAL_SHELL_PREFIX}${slug}.asset`;
}
