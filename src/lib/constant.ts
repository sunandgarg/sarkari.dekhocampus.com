export const SITE_CONFIG = {
  name: "Sarkari DekhoCampus",
  domain: "sarkari.dekhocampus.com",
  scheme: "https",
  supportEmail: "outreach@dekhocampus.com",
  searchPath: "/",
  ogImagePath: "/og-image.jpg",
  logoPath: "/logo.png",
} as const;

export const SITE_URL = `${SITE_CONFIG.scheme}://${SITE_CONFIG.domain}`;
export const SITE_HOST = SITE_CONFIG.domain;

export function absoluteSiteUrl(path = "/") {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

export function absoluteCanonical(urlOrPath?: string) {
  if (!urlOrPath) return undefined;
  if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
  return absoluteSiteUrl(urlOrPath);
}
