import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CookieConsent, getPrefillCookie, savePrefillCookie } from "@/components/CookieConsent";
import { COOKIE_CONSENT_KEY, COOKIE_SETTINGS_OPEN_EVENT } from "@/lib/promptSequence";
import { COOKIE_PREFS_KEY } from "@/lib/cookiePreferences";

describe("CookieConsent", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => vi.useRealTimers());

  it("pins the consent bar to the mobile top and desktop bottom", () => {
    render(<CookieConsent />);

    act(() => vi.advanceTimersByTime(1_500));

    const bar = screen.getByTestId("cookie-consent-bar");
    expect(bar).toHaveClass("top-0", "bottom-auto", "md:top-auto", "md:bottom-0");
    expect(screen.getByRole("button", { name: "Essential only" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept all" })).toBeInTheDocument();
  });

  it("stores Essential only with every optional purpose disabled", () => {
    render(<CookieConsent />);
    act(() => vi.advanceTimersByTime(1_500));
    fireEvent.click(screen.getByRole("button", { name: "Essential only" }));
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toBe("essential");
    expect(JSON.parse(localStorage.getItem(COOKIE_PREFS_KEY) || "{}")).toEqual({
      essential: true,
      prefill: false,
      analytics: false,
      marketing: false,
    });
  });

  it("can be reopened from the footer after an earlier choice", () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "essential");
    render(<CookieConsent />);
    act(() => window.dispatchEvent(new Event(COOKIE_SETTINGS_OPEN_EVENT)));
    expect(screen.getByText("Personalisation (prefill)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save preferences" })).toBeInTheDocument();
  });

  it("does not read or write personal prefill data for legacy essential-only consent", () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "essential");
    localStorage.setItem(COOKIE_PREFS_KEY, JSON.stringify({ prefill: true, analytics: true, marketing: true }));
    localStorage.setItem("dc_user_prefill_v1", JSON.stringify({ name: "Legacy user" }));
    expect(getPrefillCookie()).toEqual({});
    savePrefillCookie({ name: "New user" });
    expect(localStorage.getItem("dc_user_prefill_v1")).toBeNull();
  });
});
