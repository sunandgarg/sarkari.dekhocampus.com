import { useEffect, useRef, useState } from "react";
import { COOKIE_RESOLVED_EVENT } from "@/lib/promptSequence";
import { COOKIE_PREFS_KEY, readCookiePreferences, type CookiePreferences } from "@/lib/cookiePreferences";
import { COOKIE_CONSENT_KEY } from "@/lib/promptSequence";

const hardReloadCurrentPage = () => window.location.reload();

export function crossTabTrackingChangeRequiresReload(previous: CookiePreferences, next: CookiePreferences) {
  return previous.resolved
    && (previous.analytics !== next.analytics || previous.marketing !== next.marketing);
}

export function useCookiePreferences(reloadOnCrossTabTrackingChange: () => void = hardReloadCurrentPage) {
  const [preferences, setPreferences] = useState(readCookiePreferences);
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;

  useEffect(() => {
    const refresh = () => {
      const next = readCookiePreferences();
      preferencesRef.current = next;
      setPreferences(next);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== COOKIE_CONSENT_KEY && event.key !== COOKIE_PREFS_KEY) return;
      const previous = preferencesRef.current;
      const next = readCookiePreferences();
      preferencesRef.current = next;
      setPreferences(next);
      // The originating tab performs its own topology reload. Storage events are
      // delivered only to the other tabs, which must independently rebuild all
      // vendor code after either a grant or a withdrawal changes its topology.
      if (crossTabTrackingChangeRequiresReload(previous, next)) reloadOnCrossTabTrackingChange();
    };
    window.addEventListener(COOKIE_RESOLVED_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(COOKIE_RESOLVED_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [reloadOnCrossTabTrackingChange]);

  return preferences;
}
