import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  adsAllowedForContext,
  classifyAdDevice,
  pickAdUnit,
  resolveAdsenseRuntime,
  useAdScripts,
  useAdsenseSettings,
  useAdUnits,
  type AdUnit,
  type AdsenseSettings,
} from "@/hooks/useAdsense";
import { COOKIE_PREFS_KEY } from "@/lib/cookiePreferences";
import { COOKIE_CONSENT_KEY, COOKIE_RESOLVED_EVENT } from "@/lib/promptSequence";

const backendMock = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock("@/integrations/backend/client", () => ({
  backendClient: { from: backendMock.from },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, roles: [] }),
}));

const settings = (overrides: Partial<AdsenseSettings> = {}): AdsenseSettings => ({
  id: "settings-1",
  publisher_id: "",
  client_id: "",
  account_id: "",
  verification_meta: "",
  auto_ads_enabled: false,
  ads_globally_enabled: true,
  enabled_on_mobile: true,
  enabled_on_desktop: true,
  enabled_for_guests: true,
  enabled_for_logged_in: true,
  disabled_roles: [],
  disabled_pages: [],
  ads_per_page_limit: 0,
  lazy_load_enabled: true,
  refresh_interval_seconds: 0,
  head_scripts: "",
  body_scripts: "",
  footer_scripts: "",
  custom_css: "",
  custom_js: "",
  ...overrides,
});

const unit = (overrides: Partial<AdUnit> = {}): AdUnit => ({
  id: "unit-1",
  name: "Article slot",
  ad_type: "display",
  placement: "article",
  position: "after-overview",
  ad_slot_id: "1234567890",
  ad_format: "auto",
  full_width_responsive: true,
  custom_html: "",
  priority: 10,
  is_active: true,
  start_date: null,
  end_date: null,
  target_devices: [],
  target_roles: [],
  target_countries: [],
  target_categories: [],
  url_pattern: "",
  min_width: null,
  min_height: 250,
  ...overrides,
});

function queryBuilder(table: string) {
  const result = table === "adsense_settings" ? null : [];
  const builder: any = {
    select: () => builder,
    order: () => builder,
    limit: () => builder,
    eq: () => builder,
    maybeSingle: async () => ({ data: result, error: null }),
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve({ data: result, error: null }).then(resolve, reject),
  };
  return builder;
}

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function TestQueryProvider({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("AdSense runtime policy", () => {
  beforeEach(() => {
    localStorage.clear();
    backendMock.from.mockReset();
    backendMock.from.mockImplementation(queryBuilder);
  });

  it("does not query any advertising configuration before marketing consent", async () => {
    const view = renderHook(() => ({
      settings: useAdsenseSettings(),
      units: useAdUnits(),
      scripts: useAdScripts(),
    }), { wrapper: wrapper() });

    expect(view.result.current.settings.fetchStatus).toBe("idle");
    expect(view.result.current.units.fetchStatus).toBe("idle");
    expect(view.result.current.scripts.fetchStatus).toBe("idle");
    expect(backendMock.from).not.toHaveBeenCalled();

    act(() => {
      localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
      localStorage.setItem(COOKIE_PREFS_KEY, JSON.stringify({ analytics: false, marketing: true, prefill: false }));
      window.dispatchEvent(new Event(COOKIE_RESOLVED_EVENT));
    });

    await waitFor(() => expect(backendMock.from).toHaveBeenCalledTimes(3));
    expect(backendMock.from.mock.calls.map(([table]) => table).sort()).toEqual([
      "ad_scripts",
      "ad_units",
      "adsense_settings",
    ]);
  });

  it("uses the owned fallback only while settings identity is unconfigured", () => {
    expect(resolveAdsenseRuntime(undefined)).toMatchObject({ ready: false, globallyEnabled: false, clientId: null });
    expect(resolveAdsenseRuntime(null)).toMatchObject({
      ready: true,
      globallyEnabled: true,
      clientId: "ca-pub-4858806955717066",
      autoAdsEnabled: true,
      usingFallbackIdentity: true,
    });
    expect(resolveAdsenseRuntime(settings())).toMatchObject({
      clientId: "ca-pub-4858806955717066",
      autoAdsEnabled: true,
      usingFallbackIdentity: true,
    });
    expect(resolveAdsenseRuntime(settings({ publisher_id: "pub-1111111111111111", auto_ads_enabled: false }))).toMatchObject({
      clientId: "ca-pub-1111111111111111",
      autoAdsEnabled: false,
      usingFallbackIdentity: false,
    });
    expect(resolveAdsenseRuntime(settings({ ads_globally_enabled: false }))).toMatchObject({
      globallyEnabled: false,
      clientId: null,
      autoAdsEnabled: false,
    });
  });

  it("derives the client from the authoritative publisher when the legacy client is stale", () => {
    expect(resolveAdsenseRuntime(settings({
      publisher_id: "pub-4858806955717066",
      client_id: "ca-pub-1111111111111111",
      auto_ads_enabled: true,
    }))).toMatchObject({
      clientId: "ca-pub-4858806955717066",
      autoAdsEnabled: true,
      usingFallbackIdentity: false,
    });
  });

  it("does not mistake a settings-query failure for an unconfigured account", async () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    localStorage.setItem(COOKIE_PREFS_KEY, JSON.stringify({ analytics: false, marketing: true, prefill: false }));
    const failure = new Error("settings unavailable");
    const builder: any = {
      select: () => builder,
      order: () => builder,
      limit: () => builder,
      maybeSingle: async () => ({ data: null, error: failure }),
    };
    backendMock.from.mockReturnValue(builder);

    const view = renderHook(() => useAdsenseSettings(), { wrapper: wrapper() });
    await waitFor(() => expect(view.result.current.status).toBe("error"));

    expect(view.result.current.data).toBeUndefined();
    expect(resolveAdsenseRuntime(view.result.current.data)).toMatchObject({
      ready: false,
      clientId: null,
      autoAdsEnabled: false,
    });
  });

  it("enforces device, login, disabled-role and disabled-page settings", () => {
    const configured = settings({
      client_id: "ca-pub-1111111111111111",
      enabled_on_mobile: false,
      disabled_roles: ["manager"],
      disabled_pages: ["article", "/blocked"],
    });
    const runtime = resolveAdsenseRuntime(configured);

    expect(adsAllowedForContext(configured, runtime, { userPresent: false, roles: ["guest"], device: "mobile" })).toBe(false);
    expect(adsAllowedForContext(configured, runtime, { userPresent: true, roles: ["manager"], device: "desktop" })).toBe(false);
    expect(adsAllowedForContext(configured, runtime, { userPresent: false, roles: ["guest"], device: "desktop", pageKey: "article" })).toBe(false);
    expect(adsAllowedForContext(configured, runtime, { userPresent: false, roles: ["guest"], device: "desktop", path: "/blocked" })).toBe(false);
    expect(adsAllowedForContext(configured, runtime, { userPresent: false, roles: ["guest"], device: "desktop", path: "/news/open" })).toBe(true);
    expect(classifyAdDevice(390)).toBe("mobile");
    expect(classifyAdDevice(800)).toBe("tablet");
    expect(classifyAdDevice(1440)).toBe("desktop");
  });

  it("fails closed for unmatched unit targeting and minimum widths", () => {
    const targeted = unit({
      target_devices: ["desktop"],
      target_roles: ["admin"],
      target_countries: ["IN"],
      target_categories: ["Latest Jobs"],
      url_pattern: "/news/",
      min_width: 1000,
    });

    expect(pickAdUnit([targeted], "article", "after-overview", {
      viewportWidth: 1440,
      device: "desktop",
      roles: ["admin"],
      country: "in",
      category: "latest jobs",
      path: "/news/example",
    })).toEqual(targeted);
    expect(pickAdUnit([targeted], "article", "after-overview", {
      viewportWidth: 800,
      device: "tablet",
      roles: ["admin"],
      country: "in",
      category: "latest jobs",
      path: "/news/example",
    })).toBeNull();
    expect(pickAdUnit([targeted], "article", "after-overview", {
      viewportWidth: 1440,
      device: "desktop",
      roles: ["user"],
      country: "in",
      category: "latest jobs",
      path: "/news/example",
    })).toBeNull();
    expect(pickAdUnit([targeted], "article", "after-overview", {
      viewportWidth: 1440,
      device: "desktop",
      roles: ["admin"],
      path: "/news/example",
    })).toBeNull();
  });
});
