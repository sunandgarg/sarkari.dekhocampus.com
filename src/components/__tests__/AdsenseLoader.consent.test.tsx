import { act, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdsenseLoader } from "@/components/ads/AdsenseLoader";

const mocked = vi.hoisted(() => ({
  preferences: { resolved: false, essential: true, prefill: false, analytics: false, marketing: false },
  settings: {
    client_id: "",
    publisher_id: "",
    auto_ads_enabled: false,
    ads_globally_enabled: true,
    ads_per_page_limit: 0,
    lazy_load_enabled: true,
    verification_meta: "",
    custom_css: "",
    custom_js: "window.__sarkariCustomScript=(window.__sarkariCustomScript||0)+1;",
    head_scripts: "<script>window.__sarkariRawScript=(window.__sarkariRawScript||0)+1;</script>",
    body_scripts: "",
    footer_scripts: "",
  },
  scripts: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/hooks/useCookiePreferences", () => ({
  useCookiePreferences: () => mocked.preferences,
}));

vi.mock("@/hooks/useAdsense", () => ({
  DEFAULT_ADSENSE_CLIENT_ID: "ca-pub-4858806955717066",
  resolveAdsenseRuntime: (settings: typeof mocked.settings | null | undefined) => {
    if (settings === undefined) return { ready: false, globallyEnabled: false, clientId: null, autoAdsEnabled: false, usingFallbackIdentity: false };
    const globallyEnabled = settings === null || Boolean(settings.ads_globally_enabled);
    const configured = settings ? settings.publisher_id || settings.client_id : "";
    return {
      ready: true,
      globallyEnabled,
      clientId: globallyEnabled ? configured || "ca-pub-4858806955717066" : null,
      autoAdsEnabled: globallyEnabled && (configured ? Boolean(settings?.auto_ads_enabled) : true),
      usingFallbackIdentity: !configured,
    };
  },
  useAdsenseSettings: () => ({ data: mocked.settings, isSuccess: true }),
  useAdScripts: () => ({ data: mocked.scripts }),
}));

function Harness() {
  return <MemoryRouter><AdsenseLoader /></MemoryRouter>;
}

describe("AdsenseLoader consent boundary", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocked.preferences = { resolved: false, essential: true, prefill: false, analytics: false, marketing: false };
    mocked.settings = {
      client_id: "",
      publisher_id: "",
      auto_ads_enabled: false,
      ads_globally_enabled: true,
      ads_per_page_limit: 0,
      lazy_load_enabled: true,
      verification_meta: "",
      custom_css: "",
      custom_js: "window.__sarkariCustomScript=(window.__sarkariCustomScript||0)+1;",
      head_scripts: "<script>window.__sarkariRawScript=(window.__sarkariRawScript||0)+1;</script>",
      body_scripts: "",
      footer_scripts: "",
    };
    delete (window as Window & { __sarkariCustomScript?: number }).__sarkariCustomScript;
    delete (window as Window & { __sarkariRawScript?: number }).__sarkariRawScript;
    const bootstrap = document.createElement("script");
    bootstrap.id = "test-csp-bootstrap";
    bootstrap.nonce = "test-response-nonce";
    document.head.appendChild(bootstrap);
  });

  afterEach(() => {
    document.querySelectorAll("#adsense-custom-js,#adsense-head-scripts,#adsbygoogle-lib,#adsbygoogle-autoads,#adsense-verify-meta,#test-csp-bootstrap,script[data-dc-executable]").forEach((node) => node.remove());
    document.querySelectorAll('meta[name="google-adsense-account"]').forEach((node) => node.remove());
    delete (window as Window & { adsbygoogle?: unknown }).adsbygoogle;
    vi.useRealTimers();
  });

  it.each([
    { resolved: false, marketing: false, label: "undecided" },
    { resolved: true, marketing: false, label: "rejected or essential-only" },
  ])("does not inject marketing scripts when consent is $label", ({ resolved, marketing }) => {
    mocked.preferences = { ...mocked.preferences, resolved, marketing };
    render(<Harness />);
    act(() => vi.advanceTimersByTime(6_000));
    expect(document.getElementById("adsense-custom-js")).toBeNull();
    expect(document.getElementById("adsense-head-scripts")).toBeNull();
  });

  it("recreates trusted raw scripts as executable nodes and removes them after withdrawal", () => {
    mocked.preferences = { ...mocked.preferences, resolved: true, marketing: true };
    const view = render(<Harness />);
    act(() => vi.advanceTimersByTime(5_000));

    expect(document.getElementById("adsense-custom-js")).toBeInstanceOf(HTMLScriptElement);
    expect(document.getElementById("adsense-head-scripts")).toBeInstanceOf(HTMLMetaElement);
    const rawScript = document.querySelector<HTMLScriptElement>('script[data-dc-executable="true"]');
    expect(rawScript).toBeInstanceOf(HTMLScriptElement);
    expect(rawScript?.textContent).toContain("__sarkariRawScript");
    expect(rawScript?.nonce).toBe("test-response-nonce");
    const autoWrapper = document.createElement("div");
    autoWrapper.className = "google-auto-placed";
    document.body.appendChild(autoWrapper);

    (window as Window & { adsbygoogle?: unknown[] }).adsbygoogle = [{}];
    mocked.preferences = { ...mocked.preferences, marketing: false };
    view.rerender(<Harness />);
    expect(document.getElementById("adsense-custom-js")).toBeNull();
    expect(document.getElementById("adsense-head-scripts")).toBeNull();
    expect(document.querySelector('script[data-dc-executable="true"]')).toBeNull();
    expect(document.querySelector(".google-auto-placed")).toBeNull();
    expect((window as Window & { adsbygoogle?: unknown[] }).adsbygoogle).toBeUndefined();
  });

  it("preserves queued manual requests across ordinary settings rerenders", () => {
    mocked.preferences = { ...mocked.preferences, resolved: true, marketing: true };
    const view = render(<Harness />);
    (window as Window & { adsbygoogle?: unknown[] }).adsbygoogle = [{}];

    mocked.settings = { ...mocked.settings, custom_css: ".ad-test { color: black; }" };
    view.rerender(<Harness />);

    expect((window as Window & { adsbygoogle?: unknown[] }).adsbygoogle).toHaveLength(1);
  });

  it("uses the site-owned publisher without a duplicate legacy Auto Ads command", () => {
    mocked.preferences = { ...mocked.preferences, resolved: true, marketing: true };
    render(<Harness />);
    act(() => vi.advanceTimersByTime(5_000));

    const library = document.getElementById("adsbygoogle-lib") as HTMLScriptElement | null;
    expect(library?.src).toContain("client=ca-pub-4858806955717066");
    expect(document.getElementById("adsbygoogle-autoads")).toBeNull();
    expect(document.head.textContent).not.toContain("enable_page_level_ads");
  });

  it("never applies the fallback when ads are explicitly disabled", () => {
    mocked.preferences = { ...mocked.preferences, resolved: true, marketing: true };
    mocked.settings = { ...mocked.settings, ads_globally_enabled: false };
    render(<Harness />);
    act(() => vi.advanceTimersByTime(6_000));

    expect(document.getElementById("adsbygoogle-lib")).toBeNull();
    expect(document.getElementById("adsbygoogle-autoads")).toBeNull();
  });

  it("respects the Auto Ads toggle once an administrator configures an identity", () => {
    mocked.preferences = { ...mocked.preferences, resolved: true, marketing: true };
    mocked.settings = { ...mocked.settings, client_id: "ca-pub-1111111111111111", auto_ads_enabled: false };
    render(<Harness />);
    act(() => vi.advanceTimersByTime(5_000));

    expect((document.getElementById("adsbygoogle-lib") as HTMLScriptElement | null)?.src).toContain("ca-pub-1111111111111111");
    expect(document.getElementById("adsbygoogle-autoads")).toBeNull();
  });

  it("updates a baked account meta to the configured publisher and restores it on withdrawal", () => {
    const meta = document.createElement("meta");
    meta.name = "google-adsense-account";
    meta.content = "ca-pub-4858806955717066";
    document.head.appendChild(meta);
    mocked.preferences = { ...mocked.preferences, resolved: true, marketing: true };
    mocked.settings = {
      ...mocked.settings,
      client_id: "ca-pub-1111111111111111",
      verification_meta: "ca-pub-1111111111111111",
    };

    const view = render(<Harness />);
    act(() => vi.advanceTimersByTime(5_000));
    expect(meta.content).toBe("ca-pub-1111111111111111");

    mocked.preferences = { ...mocked.preferences, marketing: false };
    view.rerender(<Harness />);
    expect(meta.content).toBe("ca-pub-4858806955717066");
  });
});
