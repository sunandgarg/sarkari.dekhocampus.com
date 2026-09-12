import { beforeEach, describe, expect, it } from "vitest";
import { COOKIE_CONSENT_KEY } from "@/lib/promptSequence";
import { COOKIE_PREFS_KEY, readCookiePreferences } from "@/lib/cookiePreferences";

describe("readCookiePreferences", () => {
  beforeEach(() => localStorage.clear());

  it("fails closed before a visitor makes a choice", () => {
    expect(readCookiePreferences()).toEqual({
      resolved: false,
      essential: true,
      prefill: false,
      analytics: false,
      marketing: false,
    });
  });

  it.each(["essential", "rejected"])("keeps every optional purpose disabled for %s", (decision) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, decision);
    localStorage.setItem(COOKIE_PREFS_KEY, JSON.stringify({ prefill: true, analytics: true, marketing: true }));
    expect(readCookiePreferences()).toMatchObject({
      resolved: true,
      prefill: false,
      analytics: false,
      marketing: false,
    });
  });

  it("enables all optional purposes for a legacy accept-all decision", () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    expect(readCookiePreferences()).toMatchObject({ prefill: true, analytics: true, marketing: true });
  });

  it("honours an accepted custom preference set without broadening it", () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    localStorage.setItem(COOKIE_PREFS_KEY, JSON.stringify({ prefill: true, analytics: true, marketing: false }));
    expect(readCookiePreferences()).toMatchObject({ prefill: true, analytics: true, marketing: false });
  });
});
