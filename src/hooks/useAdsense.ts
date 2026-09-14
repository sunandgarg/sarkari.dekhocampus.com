import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { backendClient } from "@/integrations/backend/client";
import { useAuth } from "@/hooks/useAuth";
import { useCookiePreferences } from "@/hooks/useCookiePreferences";

export const DEFAULT_ADSENSE_CLIENT_ID = "ca-pub-4858806955717066";

type DatabaseFlag = boolean | number | string | null | undefined;

export interface AdsenseSettings {
  id: string;
  publisher_id: string;
  client_id: string;
  account_id: string;
  verification_meta: string;
  auto_ads_enabled: DatabaseFlag;
  ads_globally_enabled: DatabaseFlag;
  enabled_on_mobile: DatabaseFlag;
  enabled_on_desktop: DatabaseFlag;
  enabled_for_guests: DatabaseFlag;
  enabled_for_logged_in: DatabaseFlag;
  disabled_roles: string[];
  disabled_pages: string[];
  ads_per_page_limit: number;
  lazy_load_enabled: DatabaseFlag;
  refresh_interval_seconds: number;
  head_scripts: string;
  body_scripts: string;
  footer_scripts: string;
  custom_css: string;
  custom_js: string;
}

export interface AdUnit {
  id: string;
  name: string;
  ad_type: string;
  placement: string;
  position: string;
  ad_slot_id: string;
  ad_format: string;
  full_width_responsive: boolean;
  custom_html: string;
  priority: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  target_devices: string[];
  target_roles: string[];
  target_countries: string[];
  target_categories: string[];
  url_pattern: string;
  min_width: number | null;
  min_height: number | null;
}

export interface AdScript {
  id: string;
  name: string;
  location: "head" | "body" | "footer";
  code: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
}

type AdQueryOptions = {
  enabled?: boolean;
};

export type AdDevice = "mobile" | "tablet" | "desktop";

export interface AdsenseRuntime {
  ready: boolean;
  globallyEnabled: boolean;
  clientId: string | null;
  autoAdsEnabled: boolean;
  usingFallbackIdentity: boolean;
  adsPerPageLimit: number;
  lazyLoadEnabled: boolean;
}

export interface AdTargetContext {
  viewportWidth?: number;
  device?: AdDevice;
  path?: string;
  roles?: readonly string[];
  country?: string;
  category?: string;
}

function databaseFlag(value: DatabaseFlag, fallback: boolean) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "string") return value === "true" || value === "1";
  return Boolean(value);
}

function normalizeClientId(value: string) {
  const id = value.trim();
  if (!id) return "";
  return id.startsWith("pub-") ? `ca-${id}` : id;
}

/**
 * Resolve the public AdSense identity without overriding an administrator's
 * configured account. `undefined` means the settings request is still pending;
 * `null` means no settings row exists and may use the site-owned fallback.
 */
export function resolveAdsenseRuntime(settings: AdsenseSettings | null | undefined): AdsenseRuntime {
  if (settings === undefined) {
    return {
      ready: false,
      globallyEnabled: false,
      clientId: null,
      autoAdsEnabled: false,
      usingFallbackIdentity: false,
      adsPerPageLimit: 0,
      lazyLoadEnabled: true,
    };
  }

  const globallyEnabled = settings === null
    ? true
    : databaseFlag(settings.ads_globally_enabled, false);
  const configuredIdentity = settings
    // `client_id` is a derived legacy column and can lag behind an edited
    // publisher ID. Treat the publisher value as authoritative and normalize
    // `pub-...` into the browser-facing `ca-pub-...` form.
    ? normalizeClientId(settings.publisher_id || settings.client_id || "")
    : "";
  const usingFallbackIdentity = !configuredIdentity;
  const clientId = globallyEnabled
    ? configuredIdentity || DEFAULT_ADSENSE_CLIENT_ID
    : null;

  return {
    ready: true,
    globallyEnabled,
    clientId,
    // A blank/default settings row should not silently disable the site-owned
    // Auto Ads fallback. Once an identity is configured, the admin toggle wins.
    autoAdsEnabled: globallyEnabled && (usingFallbackIdentity
      ? true
      : databaseFlag(settings?.auto_ads_enabled, false)),
    usingFallbackIdentity,
    adsPerPageLimit: Math.max(0, Number(settings?.ads_per_page_limit) || 0),
    lazyLoadEnabled: databaseFlag(settings?.lazy_load_enabled, true),
  };
}

function useMarketingQueryEnabled(requested = true) {
  const preferences = useCookiePreferences();
  return requested && preferences.resolved && preferences.marketing;
}

export function useAdsenseSettings(options: AdQueryOptions = {}) {
  const enabled = useMarketingQueryEnabled(options.enabled !== false);
  return useQuery({
    queryKey: ["adsense-settings"],
    queryFn: async () => {
      const { data, error } = await (backendClient as any)
        .from("adsense_settings")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as AdsenseSettings | null;
    },
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useAdUnits(options: AdQueryOptions = {}) {
  const enabled = useMarketingQueryEnabled(options.enabled !== false);
  return useQuery({
    queryKey: ["ad-units", "active"],
    queryFn: async () => {
      const { data, error } = await (backendClient as any)
        .from("ad_units")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: false });
      if (error) throw error;
      return (Array.isArray(data) ? data : []) as AdUnit[];
    },
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useAdScripts(options: AdQueryOptions = {}) {
  const enabled = useMarketingQueryEnabled(options.enabled !== false);
  return useQuery({
    queryKey: ["ad-scripts", "active"],
    queryFn: async () => {
      const { data, error } = await (backendClient as any)
        .from("ad_scripts")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return (Array.isArray(data) ? data : []) as AdScript[];
    },
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function classifyAdDevice(viewportWidth: number): AdDevice {
  if (viewportWidth <= 600) return "mobile";
  if (viewportWidth <= 1024) return "tablet";
  return "desktop";
}

function normalizeTargets(values: readonly string[] | null | undefined) {
  return (values ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean);
}

function matchesTarget(value: string | undefined, targets: readonly string[] | null | undefined) {
  const normalizedTargets = normalizeTargets(targets);
  if (!normalizedTargets.length) return true;
  return Boolean(value && normalizedTargets.includes(value.trim().toLowerCase()));
}

export function adsAllowedForContext(
  settings: AdsenseSettings | null,
  runtime: AdsenseRuntime,
  context: {
    userPresent: boolean;
    roles: readonly string[];
    device: AdDevice;
    pageKey?: string;
    path?: string;
  },
) {
  if (!runtime.ready || !runtime.globallyEnabled || !runtime.clientId) return false;

  if (settings) {
    const mobile = context.device === "mobile";
    if (mobile && !databaseFlag(settings.enabled_on_mobile, true)) return false;
    if (!mobile && !databaseFlag(settings.enabled_on_desktop, true)) return false;
    if (context.userPresent && !databaseFlag(settings.enabled_for_logged_in, true)) return false;
    if (!context.userPresent && !databaseFlag(settings.enabled_for_guests, true)) return false;

    const effectiveRoles = context.roles.length
      ? context.roles.map((role) => role.toLowerCase())
      : [context.userPresent ? "user" : "guest"];
    if (normalizeTargets(settings.disabled_roles).some((role) => effectiveRoles.includes(role))) return false;

    const disabledPages = normalizeTargets(settings.disabled_pages);
    if (context.pageKey && disabledPages.includes(context.pageKey.toLowerCase())) return false;
    if (context.path && disabledPages.includes(context.path.toLowerCase())) return false;
  }

  return true;
}

function currentViewportWidth() {
  return typeof window === "undefined" ? Number.MAX_SAFE_INTEGER : window.innerWidth;
}

function useViewportWidth() {
  const [width, setWidth] = useState(currentViewportWidth);
  useEffect(() => {
    const update = () => setWidth(currentViewportWidth());
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);
  return width;
}

export function useAdsEligibility(pageKey?: string) {
  const preferences = useCookiePreferences();
  const settingsQuery = useAdsenseSettings();
  const { user, roles } = useAuth();
  const viewportWidth = useViewportWidth();
  const device = classifyAdDevice(viewportWidth);
  const path = typeof window === "undefined" ? "" : window.location.pathname;
  const runtime = resolveAdsenseRuntime(settingsQuery.data);
  const consentGranted = preferences.resolved && preferences.marketing;
  const settingsReady = consentGranted && settingsQuery.isSuccess;
  const effectiveRoles = roles.length ? roles : user ? ["user"] : ["guest"];
  const allowed = settingsReady && adsAllowedForContext(settingsQuery.data ?? null, runtime, {
    userPresent: Boolean(user),
    roles: effectiveRoles,
    device,
    pageKey,
    path,
  });

  return {
    allowed,
    consentGranted,
    settingsReady,
    settings: settingsQuery.data ?? null,
    runtime,
    viewportWidth,
    device,
    path,
    roles: effectiveRoles,
  };
}

/** Resolve whether ads should render for the current user, device and page. */
export function useAdsAllowed(pageKey?: string) {
  return useAdsEligibility(pageKey).allowed;
}

export function pickAdUnit(
  units: AdUnit[] | undefined,
  placement: string,
  position?: string,
  context: AdTargetContext = {},
): AdUnit | null {
  if (!Array.isArray(units) || !units.length) return null;
  const now = Date.now();
  const viewportWidth = context.viewportWidth ?? currentViewportWidth();
  const device = context.device ?? classifyAdDevice(viewportWidth);
  const path = context.path ?? (typeof window === "undefined" ? "" : window.location.pathname);
  const roles = normalizeTargets(context.roles);
  const candidates = units.filter((unit) => {
    if (unit.placement !== placement) return false;
    if (position && unit.position !== position) return false;
    if (unit.start_date && new Date(unit.start_date).getTime() > now) return false;
    if (unit.end_date && new Date(unit.end_date).getTime() < now) return false;
    if (!matchesTarget(device, unit.target_devices)) return false;
    if (unit.target_roles?.length && !normalizeTargets(unit.target_roles).some((role) => roles.includes(role))) return false;
    if (!matchesTarget(context.country, unit.target_countries)) return false;
    if (!matchesTarget(context.category, unit.target_categories)) return false;
    if (unit.url_pattern && !path.includes(unit.url_pattern)) return false;
    if (unit.min_width && viewportWidth < Number(unit.min_width)) return false;
    return true;
  });
  return candidates[0] ?? null;
}
