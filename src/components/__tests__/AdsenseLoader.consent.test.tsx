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
  useAdsenseSettings: () => ({ data: mocked.settings }),
  useAdScripts: () => ({ data: mocked.scripts }),
}));

function Harness() {
  return <MemoryRouter><AdsenseLoader /></MemoryRouter>;
}

describe("AdsenseLoader consent boundary", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocked.preferences = { resolved: false, essential: true, prefill: false, analytics: false, marketing: false };
    delete (window as Window & { __sarkariCustomScript?: number }).__sarkariCustomScript;
    delete (window as Window & { __sarkariRawScript?: number }).__sarkariRawScript;
    const bootstrap = document.createElement("script");
    bootstrap.id = "test-csp-bootstrap";
    bootstrap.nonce = "test-response-nonce";
    document.head.appendChild(bootstrap);
  });

  afterEach(() => {
    document.querySelectorAll("#adsense-custom-js,#adsense-head-scripts,#test-csp-bootstrap,script[data-dc-executable]").forEach((node) => node.remove());
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

    mocked.preferences = { ...mocked.preferences, marketing: false };
    view.rerender(<Harness />);
    expect(document.getElementById("adsense-custom-js")).toBeNull();
    expect(document.getElementById("adsense-head-scripts")).toBeNull();
    expect(document.querySelector('script[data-dc-executable="true"]')).toBeNull();
  });
});
