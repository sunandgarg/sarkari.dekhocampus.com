import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, ShieldCheck, Settings2, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COOKIE_CONSENT_KEY, COOKIE_SETTINGS_OPEN_EVENT, signalCookieResolved } from "@/lib/promptSequence";
import { COOKIE_PREFS_KEY, readCookiePreferences } from "@/lib/cookiePreferences";

const COOKIE_KEY = COOKIE_CONSENT_KEY;             // "accepted" | "essential" | "rejected"
const PROFILE_KEY = "dc_user_prefill_v1";
const PREFS_KEY = COOKIE_PREFS_KEY;              // JSON {essential:true, prefill:bool, analytics:bool, marketing:bool}

interface Prefs {
  essential: true;
  prefill: boolean;
  analytics: boolean;
  marketing: boolean;
}
const DEFAULT_PREFS: Prefs = { essential: true, prefill: false, analytics: false, marketing: false };

export function trackingConsentChangeRequiresReload(previous: ReturnType<typeof readCookiePreferences>, next: Prefs) {
  return previous.resolved
    && (previous.analytics !== next.analytics || previous.marketing !== next.marketing);
}

export interface PrefillCookie {
  name?: string;
  email?: string;
  phone?: string;
  state?: string;
  city?: string;
  className?: string;
}

function getPrefs(): Prefs {
  try {
    const decision = localStorage.getItem(COOKIE_KEY);
    if (decision === "essential" || decision === "rejected") {
      return { essential: true, prefill: false, analytics: false, marketing: false };
    }
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch { return DEFAULT_PREFS; }
}

export function getPrefillCookie(): PrefillCookie {
  try {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (consent !== "accepted" || !readCookiePreferences().prefill) {
      localStorage.removeItem(PROFILE_KEY);
      return {};
    }
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function savePrefillCookie(data: PrefillCookie) {
  try {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (consent !== "accepted" || !readCookiePreferences().prefill) {
      localStorage.removeItem(PROFILE_KEY);
      return;
    }
    const existing = getPrefillCookie();
    const merged = { ...existing, ...data };
    Object.keys(merged).forEach(k => { if (!merged[k as keyof PrefillCookie]) delete merged[k as keyof PrefillCookie]; });
    localStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
  } catch {}
}

export function CookieConsent({ initiallyOpen = false }: { initiallyOpen?: boolean } = {}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [showCustom, setShowCustom] = useState(initiallyOpen);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    const saved = localStorage.getItem(COOKIE_KEY);
    setPrefs(getPrefs());
    const openSettings = () => {
      setPrefs(getPrefs());
      setShowCustom(true);
      setOpen(true);
    };
    window.addEventListener(COOKIE_SETTINGS_OPEN_EVENT, openSettings);
    if (!saved) {
      const t = setTimeout(() => setOpen(true), 1500);
      return () => {
        clearTimeout(t);
        window.removeEventListener(COOKIE_SETTINGS_OPEN_EVENT, openSettings);
      };
    }
    return () => window.removeEventListener(COOKIE_SETTINGS_OPEN_EVENT, openSettings);
  }, []);

  useEffect(() => {
    if (!initiallyOpen) return;
    setPrefs(getPrefs());
    setShowCustom(true);
    setOpen(true);
  }, [initiallyOpen]);

  const persist = (consent: "accepted" | "essential" | "rejected", finalPrefs: Prefs) => {
    const previousPreferences = readCookiePreferences();
    const requiresCleanReload = trackingConsentChangeRequiresReload(previousPreferences, finalPrefs);
    localStorage.setItem(COOKIE_KEY, consent);
    localStorage.setItem(PREFS_KEY, JSON.stringify(finalPrefs));
    if (consent !== "accepted" || !finalPrefs.prefill) localStorage.removeItem(PROFILE_KEY);
    const consentState = {
      analytics_storage: finalPrefs.analytics ? "granted" : "denied",
      ad_storage: finalPrefs.marketing ? "granted" : "denied",
      ad_user_data: finalPrefs.marketing ? "granted" : "denied",
      ad_personalization: finalPrefs.marketing ? "granted" : "denied",
    };
    try { (window as any).gtag?.("consent", "update", consentState); } catch { /* noop */ }
    try {
      (window as any).clarity?.("consentv2", {
        analytics_Storage: finalPrefs.analytics ? "granted" : "denied",
        ad_Storage: finalPrefs.marketing ? "granted" : "denied",
      });
    } catch { /* noop */ }
    try { (window as any).fbq?.("consent", finalPrefs.marketing ? "grant" : "revoke"); } catch { /* noop */ }
    // Withdrawal stops first-party behavioural tracking as well as third-party
    // tags. Remove the optional identifiers immediately; the consent record
    // below uses a short-lived value only to deduplicate the choice itself.
    const sid = localStorage.getItem("dc_session_id") || `s_${Date.now()}`;
    if (!finalPrefs.analytics) {
      ["dc_intent_visitor_v1", "dc_session_id", "dc_session_started", "dc_session_entry"]
        .forEach((key) => localStorage.removeItem(key));
    }
    setOpen(false);
    signalCookieResolved();
    // Log the anonymous audit event without delaying the user's local choice.
    void import("@/integrations/backend/client").then(async ({ backendClient }) => {
      const { error } = await (backendClient as any).from("user_consent").insert({
          session_id: sid,
          essential: finalPrefs.essential,
          analytics: finalPrefs.analytics,
          marketing: finalPrefs.marketing,
          prefill: finalPrefs.prefill,
          user_agent: navigator.userAgent,
        });
      if (error) throw error;
    }).catch((error: unknown) => {
      console.warn(JSON.stringify({
        event: "sarkari_consent_audit_failed",
        kind: error instanceof Error ? error.name : "backend_error",
      }));
    });
    // Third-party or administrator-managed snippets may have registered global
    // callbacks that cannot be reliably reconfigured in place. Reload after a
    // resolved tracking-category change so the persisted topology is rebuilt
    // cleanly; personal prefill alone does not require a reload.
    if (requiresCleanReload) window.setTimeout(() => window.location.reload(), 150);
  };

  const acceptAll = () => persist("accepted", { essential: true, prefill: true, analytics: true, marketing: true });
  const acceptEssential = () => persist("essential", { essential: true, prefill: false, analytics: false, marketing: false });
  const saveCustom = () => persist(prefs.prefill || prefs.analytics || prefs.marketing ? "accepted" : "essential", prefs);

  const Toggle = ({ k, label, desc, locked }: { k: keyof Prefs; label: string; desc: string; locked?: boolean }) => (
    <label className="flex min-h-11 cursor-pointer items-start gap-1 py-1">
      <span className="grid h-11 w-11 flex-none place-items-center">
        <input
          type="checkbox"
          disabled={locked}
          checked={prefs[k] as boolean}
          onChange={e => setPrefs(p => ({ ...p, [k]: e.target.checked }))}
          className="h-4 w-4 rounded accent-primary disabled:opacity-50"
        />
      </span>
      <div className="flex-1">
        <div className="text-xs font-semibold flex items-center gap-1.5">{label}{locked && <span className="text-[10px] text-muted-foreground font-normal">(always on)</span>}</div>
        <div className="text-[11px] text-muted-foreground leading-snug">{desc}</div>
      </div>
    </label>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          data-testid="cookie-consent-bar"
          role="region"
          aria-label="Cookie preferences"
          className="fixed inset-x-0 bottom-0 top-auto z-[120] max-h-[82vh] max-h-[82dvh] overflow-y-auto"
        >
          <div className="rounded-t-2xl border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-2xl backdrop-blur-xl md:rounded-none">
            <div className="mx-auto max-w-7xl">
              <div className="p-3 sm:p-4 md:flex md:items-center md:gap-5">
                <div className="flex min-w-0 items-start gap-3 md:flex-1 md:items-center">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 sm:h-10 sm:w-10">
                    <Cookie className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold">We value your privacy</h3>
                      <button onClick={() => persist("rejected", { ...DEFAULT_PREFS, prefill: false, analytics: false, marketing: false })} aria-label="Close and decline optional cookies" className="inline-flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground md:hidden">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                      We use cookies to keep the site secure, remember your preferences and improve your experience. Choose what works for you.
                      {" "}Read our <a className="font-semibold text-primary underline underline-offset-2" href="/legal/privacy-policy">Privacy Policy</a> and <a className="font-semibold text-primary underline underline-offset-2" href="/legal/cookie-policy">Cookie Policy</a>.
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 md:mt-0 md:flex-nowrap">
                  {!showCustom ? (
                    <>
                      <Button onClick={() => setShowCustom(true)} variant="ghost" size="sm" className="h-11 gap-1 rounded-md px-2 text-xs">
                        <Settings2 className="h-3.5 w-3.5" /> Customise <ChevronDown className="h-3 w-3" />
                      </Button>
                      <Button onClick={acceptEssential} variant="outline" size="sm" className="h-11 flex-1 rounded-md px-3 sm:flex-none">Essential only</Button>
                      <Button onClick={acceptAll} size="sm" className="h-11 flex-1 rounded-md bg-primary px-3 hover:bg-primary/90 sm:flex-none">
                        <ShieldCheck className="mr-1.5 h-4 w-4" /> Accept all
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={() => setShowCustom(false)} variant="ghost" size="sm" className="h-11 rounded-md text-xs">Back</Button>
                      <Button onClick={() => persist("rejected", { ...DEFAULT_PREFS, prefill: false, analytics: false, marketing: false })} variant="outline" size="sm" className="h-11 flex-1 rounded-md sm:flex-none">Decline all</Button>
                      <Button onClick={saveCustom} size="sm" className="h-11 flex-1 rounded-md bg-primary hover:bg-primary/90 sm:flex-none">Save preferences</Button>
                    </>
                  )}
                  <button onClick={() => persist("rejected", { ...DEFAULT_PREFS, prefill: false, analytics: false, marketing: false })} aria-label="Close and decline optional cookies" className="hidden h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground md:inline-flex">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {showCustom && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="max-h-[55vh] overflow-y-auto border-t border-border px-4 pb-3 sm:grid sm:grid-cols-2 sm:gap-x-8 md:max-h-[40vh]"
                  >
                    <Toggle k="essential" label="Essential" desc="Login sessions, security, consent choices, form progress, lead delivery, duplicate prevention and saved preferences." locked />
                    <Toggle k="prefill" label="Personalisation (prefill)" desc="Remember your name, mobile, state and city so forms are auto-filled." />
                    <Toggle k="analytics" label="Analytics" desc="Help us understand which pages and tools work best." />
                    <Toggle k="marketing" label="Marketing & advertising" desc="Load advertising, measure campaigns and show offers that may be more relevant to your interests." />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
