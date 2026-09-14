import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_PREFS_KEY } from "@/lib/cookiePreferences";
import { COOKIE_CONSENT_KEY } from "@/lib/promptSequence";
import { trackEvent, trackLeadConversion } from "@/lib/analytics";
import { clearIntentTrackingState, getVisitorId, intentTrackingAllowed, trackIntent } from "@/lib/intentTracking";

describe("first-party analytics consent boundary", () => {
  beforeEach(() => {
    localStorage.clear();
    (window as any).dataLayer = [];
    (window as any).gtag = vi.fn();
    (window as any).fbq = vi.fn();
    (window as any).fireGoogleAdsConversion = vi.fn();
  });

  it("does not create identifiers or emit events before a choice", () => {
    trackEvent("cta_click", { cta: "Apply Now" });
    trackIntent("apply_now");
    trackLeadConversion({ source: "test" });

    expect(intentTrackingAllowed()).toBe(false);
    expect(getVisitorId()).toBe("");
    expect(localStorage.getItem("dc_intent_visitor_v1")).toBeNull();
    expect(localStorage.getItem("dc_session_id")).toBeNull();
    expect((window as any).dataLayer).toEqual([]);
    expect((window as any).gtag).not.toHaveBeenCalled();
    expect((window as any).fbq).not.toHaveBeenCalled();
  });

  it("keeps analytics and marketing independently scoped", () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    localStorage.setItem(COOKIE_PREFS_KEY, JSON.stringify({ analytics: true, marketing: false, prefill: false }));

    trackEvent("cta_click", { cta: "Apply Now" });
    trackLeadConversion({ source: "test" });

    expect(intentTrackingAllowed()).toBe(true);
    expect(getVisitorId()).not.toBe("");
    expect((window as any).gtag).toHaveBeenCalled();
    expect((window as any).fbq).not.toHaveBeenCalled();
    expect((window as any).fireGoogleAdsConversion).not.toHaveBeenCalled();
  });

  it("removes the optional visitor identifier when analytics is withdrawn", () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    localStorage.setItem(COOKIE_PREFS_KEY, JSON.stringify({ analytics: true, marketing: false, prefill: false }));
    expect(getVisitorId()).not.toBe("");
    expect(localStorage.getItem("dc_intent_visitor_v1")).not.toBeNull();

    clearIntentTrackingState();
    expect(localStorage.getItem("dc_intent_visitor_v1")).toBeNull();
  });

  it("fires a consented Google Ads lead once and stops immediately after withdrawal", () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    localStorage.setItem(COOKIE_PREFS_KEY, JSON.stringify({ analytics: false, marketing: true, prefill: false }));

    trackLeadConversion({ source: "test" });
    expect((window as any).fireGoogleAdsConversion).toHaveBeenCalledTimes(1);

    localStorage.setItem(COOKIE_PREFS_KEY, JSON.stringify({ analytics: false, marketing: false, prefill: false }));
    trackLeadConversion({ source: "test-after-withdrawal" });
    expect((window as any).fireGoogleAdsConversion).toHaveBeenCalledTimes(1);
  });
});
