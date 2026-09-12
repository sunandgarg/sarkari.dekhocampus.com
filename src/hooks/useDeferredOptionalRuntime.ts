import { useEffect, useState } from "react";
import {
  COOKIE_CONSENT_KEY,
  COOKIE_RESOLVED_EVENT,
  COOKIE_SETTINGS_OPEN_EVENT,
  hasCookieDecision,
} from "@/lib/promptSequence";

type IdleCapableWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/**
 * Keep optional privacy UI and third-party configuration work out of the
 * critical rendering path. The timeout is only an idle deadline; a browser
 * that is already idle runs the callback immediately after its first paint.
 */
export function scheduleAfterFirstPaint(callback: () => void, idleTimeout = 1_000) {
  const idleWindow = window as IdleCapableWindow;
  let cancelled = false;
  let frameHandle: number | undefined;
  let paintTimer: number | undefined;
  let workTimer: number | undefined;
  let idleHandle: number | undefined;

  const run = () => {
    if (!cancelled) callback();
  };
  const scheduleIdleWork = () => {
    if (cancelled) return;
    if (typeof idleWindow.requestIdleCallback === "function") {
      idleHandle = idleWindow.requestIdleCallback(run, { timeout: idleTimeout });
    } else {
      workTimer = window.setTimeout(run, 0);
    }
  };

  if (typeof window.requestAnimationFrame === "function") {
    frameHandle = window.requestAnimationFrame(scheduleIdleWork);
  } else {
    paintTimer = window.setTimeout(scheduleIdleWork, 0);
  }

  return () => {
    cancelled = true;
    if (frameHandle !== undefined) window.cancelAnimationFrame(frameHandle);
    if (paintTimer !== undefined) window.clearTimeout(paintTimer);
    if (workTimer !== undefined) window.clearTimeout(workTimer);
    if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle);
  };
}

export function useDeferredOptionalRuntime() {
  const [showCookieConsent, setShowCookieConsent] = useState(false);
  const [openCookieSettingsOnMount, setOpenCookieSettingsOnMount] = useState(false);
  const [showConsentedServices, setShowConsentedServices] = useState(false);

  useEffect(() => {
    const cancelScheduledMount = scheduleAfterFirstPaint(() => setShowCookieConsent(true), 500);
    const handleSettingsRequest = () => {
      // A footer settings click must never be lost while the consent chunk is
      // still downloading. CookieConsent receives this intent as a prop.
      cancelScheduledMount();
      setOpenCookieSettingsOnMount(true);
      setShowCookieConsent(true);
    };
    window.addEventListener(COOKIE_SETTINGS_OPEN_EVENT, handleSettingsRequest);
    return () => {
      cancelScheduledMount();
      window.removeEventListener(COOKIE_SETTINGS_OPEN_EVENT, handleSettingsRequest);
    };
  }, []);

  useEffect(() => {
    let cancelScheduledMount: (() => void) | undefined;
    let scheduled = false;
    const scheduleServices = () => {
      if (scheduled) return;
      scheduled = true;
      cancelScheduledMount = scheduleAfterFirstPaint(() => setShowConsentedServices(true));
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === COOKIE_CONSENT_KEY && event.newValue) scheduleServices();
    };

    if (hasCookieDecision()) scheduleServices();
    window.addEventListener(COOKIE_RESOLVED_EVENT, scheduleServices);
    window.addEventListener("storage", handleStorage);
    return () => {
      cancelScheduledMount?.();
      window.removeEventListener(COOKIE_RESOLVED_EVENT, scheduleServices);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return { showCookieConsent, openCookieSettingsOnMount, showConsentedServices };
}
