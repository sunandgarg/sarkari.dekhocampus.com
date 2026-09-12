import { COOKIE_CONSENT_KEY } from "@/lib/promptSequence";

export const COOKIE_PREFS_KEY = "dc_cookie_prefs_v1";

export type CookiePreferences = {
  resolved: boolean;
  essential: true;
  prefill: boolean;
  analytics: boolean;
  marketing: boolean;
};

const DENIED: CookiePreferences = {
  resolved: false,
  essential: true,
  prefill: false,
  analytics: false,
  marketing: false,
};

export function readCookiePreferences(): CookiePreferences {
  if (typeof window === "undefined") return DENIED;
  try {
    const decision = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!decision) return DENIED;
    if (decision === "rejected") return { ...DENIED, resolved: true };
    if (decision === "essential") return { ...DENIED, resolved: true };
    if (decision !== "accepted") return DENIED;

    const fallback = { prefill: true, analytics: true, marketing: true };
    const stored = JSON.parse(localStorage.getItem(COOKIE_PREFS_KEY) || "null") as Partial<CookiePreferences> | null;
    return {
      resolved: true,
      essential: true,
      prefill: stored?.prefill === undefined ? fallback.prefill : stored.prefill === true,
      analytics: stored?.analytics === undefined ? fallback.analytics : stored.analytics === true,
      marketing: stored?.marketing === undefined ? fallback.marketing : stored.marketing === true,
    };
  } catch {
    return DENIED;
  }
}
