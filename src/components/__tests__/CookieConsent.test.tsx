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

  it("uses a bounded bottom sheet with mobile safe-area spacing", () => {
    render(<CookieConsent />);

    act(() => vi.advanceTimersByTime(1_500));

    const bar = screen.getByTestId("cookie-consent-bar");
    expect(bar).toHaveClass("bottom-0", "top-auto", "max-h-[82vh]", "max-h-[82dvh]", "overflow-y-auto");
    expect(bar).toHaveAttribute("role", "region");
    expect(bar).toHaveAttribute("aria-label", "Cookie preferences");
    expect(bar.firstElementChild).toHaveClass("pb-[env(safe-area-inset-bottom)]", "rounded-t-2xl");
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

  it("preserves a settings request made before the deferred chunk mounts", () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "essential");
    render(<CookieConsent initiallyOpen />);
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
