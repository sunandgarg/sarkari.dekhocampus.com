import { useEffect, useState } from "react";
import { COOKIE_RESOLVED_EVENT } from "@/lib/promptSequence";
import { COOKIE_PREFS_KEY, readCookiePreferences } from "@/lib/cookiePreferences";
import { COOKIE_CONSENT_KEY } from "@/lib/promptSequence";

export function useCookiePreferences() {
  const [preferences, setPreferences] = useState(readCookiePreferences);

  useEffect(() => {
    const refresh = () => setPreferences(readCookiePreferences());
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === COOKIE_CONSENT_KEY || event.key === COOKIE_PREFS_KEY) refresh();
    };
    window.addEventListener(COOKIE_RESOLVED_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(COOKIE_RESOLVED_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return preferences;
}
