import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_PREFS_KEY } from "@/lib/cookiePreferences";
import { COOKIE_CONSENT_KEY } from "@/lib/promptSequence";
import { useCookiePreferences } from "@/hooks/useCookiePreferences";

function setPreferences(analytics: boolean, marketing: boolean, prefill = false) {
  localStorage.setItem(COOKIE_CONSENT_KEY, analytics || marketing || prefill ? "accepted" : "essential");
  localStorage.setItem(COOKIE_PREFS_KEY, JSON.stringify({ analytics, marketing, prefill }));
}

function dispatchCrossTabPreferenceChange(oldValue: string | null, newValue: string | null) {
  window.dispatchEvent(new StorageEvent("storage", {
    key: COOKIE_PREFS_KEY,
    oldValue,
    newValue,
  }));
}

describe("useCookiePreferences cross-tab topology", () => {
  beforeEach(() => localStorage.clear());

  it("hard-reloads this tab when another tab reduces a granted tracking category", () => {
    setPreferences(true, true);
    const oldValue = localStorage.getItem(COOKIE_PREFS_KEY);
    const reload = vi.fn();
    const view = renderHook(() => useCookiePreferences(reload));

    act(() => {
      setPreferences(true, false);
      dispatchCrossTabPreferenceChange(oldValue, localStorage.getItem(COOKIE_PREFS_KEY));
    });

    expect(view.result.current).toMatchObject({ resolved: true, analytics: true, marketing: false });
    expect(reload).toHaveBeenCalledOnce();
  });

  it("hard-reloads this tab when another tab expands tracking consent", () => {
    setPreferences(false, false);
    const oldValue = localStorage.getItem(COOKIE_PREFS_KEY);
    const reload = vi.fn();
    const view = renderHook(() => useCookiePreferences(reload));

    act(() => {
      setPreferences(true, false);
      dispatchCrossTabPreferenceChange(oldValue, localStorage.getItem(COOKIE_PREFS_KEY));
    });

    expect(view.result.current).toMatchObject({ resolved: true, analytics: true, marketing: false });
    expect(reload).toHaveBeenCalledOnce();
  });

  it("does not reload for a cross-tab prefill-only change", () => {
    setPreferences(false, false, false);
    const oldValue = localStorage.getItem(COOKIE_PREFS_KEY);
    const reload = vi.fn();
    const view = renderHook(() => useCookiePreferences(reload));

    act(() => {
      setPreferences(false, false, true);
      dispatchCrossTabPreferenceChange(oldValue, localStorage.getItem(COOKIE_PREFS_KEY));
    });

    expect(view.result.current).toMatchObject({ resolved: true, prefill: true, analytics: false, marketing: false });
    expect(reload).not.toHaveBeenCalled();
  });
});
