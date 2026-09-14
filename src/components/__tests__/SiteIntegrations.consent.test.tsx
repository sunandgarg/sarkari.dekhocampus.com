import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiteIntegrations } from "@/components/SiteIntegrations";

const mocked = vi.hoisted(() => ({
  preferences: { resolved: false, essential: true, prefill: false, analytics: false, marketing: false },
  select: vi.fn(),
}));

vi.mock("@/hooks/useCookiePreferences", () => ({
  useCookiePreferences: () => mocked.preferences,
}));

vi.mock("@/integrations/backend/client", () => ({
  backendClient: {
    from: () => ({ select: () => ({ in: mocked.select }) }),
  },
}));

function Harness() {
  return (
    <MemoryRouter>
      <SiteIntegrations />
      <RouteDriver />
    </MemoryRouter>
  );
}

function RouteDriver() {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate("/next?from=test")}>Next route</button>;
}

describe("SiteIntegrations consent boundary", () => {
  beforeEach(() => {
    mocked.preferences = { resolved: false, essential: true, prefill: false, analytics: false, marketing: false };
    mocked.select.mockReset().mockResolvedValue({ data: [], error: null });
    (window as Window & { dataLayer?: unknown[] }).dataLayer = [];
    document.querySelectorAll("#gtm-init,#ga4-lib,#ga4-init,#clarity-init,#fbq-init,#gads-lib,#gads-init-base,#gads-config,#gads-helper,#hj-init,#plausible,#gsc-meta,meta[name='google-site-verification'],script[src*='googletagmanager.com']").forEach((node) => node.remove());
    delete (window as Window & { fireGoogleAdsConversion?: unknown }).fireGoogleAdsConversion;
  });

  it("does not even resolve optional integrations before a cookie choice", async () => {
    render(<Harness />);
    await Promise.resolve();
    expect(mocked.select).not.toHaveBeenCalled();
    expect(document.getElementById("gtm-init")).toBeNull();
  });

  it("requests only the browser-safe integration allowlist", async () => {
    mocked.preferences = { ...mocked.preferences, resolved: true };
    render(<Harness />);
    await waitFor(() => expect(mocked.select).toHaveBeenCalledOnce());
    const requestedKeys = mocked.select.mock.calls[0][1] as string[];
    expect(requestedKeys).toContain("ga4_measurement_id");
    expect(requestedKeys).toContain("ms_clarity_id");
    expect(requestedKeys).not.toContain("google_places_api_key");
    expect(requestedKeys).not.toContain("clarity_data_export_token");
  });

  it("rejects malformed browser IDs instead of interpolating executable configuration", async () => {
    mocked.preferences = { ...mocked.preferences, resolved: true, analytics: false, marketing: true };
    mocked.select.mockResolvedValueOnce({
      data: [{ key: "facebook_pixel_id", value: "');window.injected=true;//", enabled: true }],
      error: null,
    });

    render(<Harness />);
    await waitFor(() => expect(mocked.select).toHaveBeenCalledOnce());
    fireEvent.pointerDown(window);
    await Promise.resolve();

    expect(document.getElementById("fbq-init")).toBeNull();
    expect((window as Window & { injected?: boolean }).injected).toBeUndefined();
  });

  it("keeps trackers disabled for Essential only", async () => {
    mocked.preferences = { ...mocked.preferences, resolved: true };
    render(<Harness />);
    await waitFor(() => expect(mocked.select).toHaveBeenCalledOnce());
    fireEvent.pointerDown(window);
    expect(document.getElementById("gtm-init")).toBeNull();
  });

  it("loads the configured tag manager only after full consent and interaction, then cleans it up", async () => {
    mocked.preferences = { ...mocked.preferences, resolved: true, analytics: true, marketing: true };
    const view = render(<Harness />);
    await waitFor(() => expect(mocked.select).toHaveBeenCalledOnce());
    fireEvent.pointerDown(window);
    await waitFor(() => expect(document.getElementById("gtm-init")).toBeInstanceOf(HTMLScriptElement));

    mocked.preferences = { ...mocked.preferences, analytics: false, marketing: false };
    view.rerender(<Harness />);
    await waitFor(() => expect(document.getElementById("gtm-init")).toBeNull());
    expect(document.querySelector('script[src*="googletagmanager.com"]')).toBeNull();
  });

  it("uses the verified public analytics identifiers for analytics-only consent", async () => {
    mocked.preferences = { ...mocked.preferences, resolved: true, analytics: true, marketing: false };
    render(<Harness />);
    await waitFor(() => expect(mocked.select).toHaveBeenCalledOnce());
    fireEvent.pointerDown(window);
    await waitFor(() => expect(document.getElementById("ga4-lib")).toBeInstanceOf(HTMLScriptElement));

    expect((document.getElementById("ga4-lib") as HTMLScriptElement).src).toContain("G-Y8E5HHTXLX");
    expect(document.getElementById("ga4-init")?.textContent).toContain("send_page_view:false");
    expect(document.getElementById("ga4-init")?.textContent).toContain("gtag('event','page_view'");
    expect(document.getElementById("clarity-init")?.textContent).toContain("y9bvg8jdmr");
    expect(document.getElementById("fbq-init")).toBeNull();
  });

  it("uses the verified Meta identifier only after marketing consent", async () => {
    mocked.preferences = { ...mocked.preferences, resolved: true, analytics: false, marketing: true };
    render(<Harness />);
    await waitFor(() => expect(mocked.select).toHaveBeenCalledOnce());
    fireEvent.pointerDown(window);
    await waitFor(() => expect(document.getElementById("fbq-init")).toBeInstanceOf(HTMLScriptElement));

    expect(document.getElementById("fbq-init")?.textContent).toContain("28062999866677764");
    expect(document.getElementById("fbq-init")?.textContent).toContain("fbq('consent','grant')");
    expect(document.getElementById("ga4-lib")).toBeNull();
    expect(document.getElementById("clarity-init")).toBeNull();
  });

  it("keeps verified public analytics available during a configuration outage", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mocked.preferences = { ...mocked.preferences, resolved: true, analytics: true, marketing: false };
    mocked.select.mockRejectedValueOnce(new Error("offline"));

    render(<Harness />);
    await waitFor(() => expect(mocked.select).toHaveBeenCalledOnce());
    fireEvent.pointerDown(window);
    await waitFor(() => expect(document.getElementById("ga4-lib")).toBeInstanceOf(HTMLScriptElement));

    expect((document.getElementById("ga4-lib") as HTMLScriptElement).src).toContain("G-Y8E5HHTXLX");
    expect(document.getElementById("clarity-init")?.textContent).toContain("y9bvg8jdmr");
    warning.mockRestore();
  });

  it("honors an explicit admin disable instead of restoring a public default", async () => {
    mocked.preferences = { ...mocked.preferences, resolved: true, analytics: true, marketing: false };
    mocked.select.mockResolvedValueOnce({
      data: [
        { key: "ga4_measurement_id", value: "G-Y8E5HHTXLX", enabled: false },
        { key: "ms_clarity_id", value: "y9bvg8jdmr", enabled: false },
      ],
      error: null,
    });

    render(<Harness />);
    await waitFor(() => expect(mocked.select).toHaveBeenCalledOnce());
    fireEvent.pointerDown(window);
    await Promise.resolve();

    expect(document.getElementById("ga4-lib")).toBeNull();
    expect(document.getElementById("clarity-init")).toBeNull();
  });

  it("honors an explicitly disabled GTM row and uses the consented direct providers", async () => {
    mocked.preferences = { ...mocked.preferences, resolved: true, analytics: true, marketing: true };
    mocked.select.mockResolvedValueOnce({
      data: [{ key: "gtm_container_id", value: "GTM-5PF56SJF", enabled: false }],
      error: null,
    });

    render(<Harness />);
    await waitFor(() => expect(mocked.select).toHaveBeenCalledOnce());
    fireEvent.pointerDown(window);

    await waitFor(() => expect(document.getElementById("ga4-lib")).toBeInstanceOf(HTMLScriptElement));
    expect(document.getElementById("gtm-init")).toBeNull();
    expect(document.getElementById("clarity-init")).toBeInstanceOf(HTMLScriptElement);
    expect(document.getElementById("fbq-init")).toBeInstanceOf(HTMLScriptElement);
  });

  it("bypasses GTM when one bundled provider is explicitly disabled", async () => {
    mocked.preferences = { ...mocked.preferences, resolved: true, analytics: true, marketing: true };
    mocked.select.mockResolvedValueOnce({
      data: [{ key: "ms_clarity_id", value: "y9bvg8jdmr", enabled: false }],
      error: null,
    });

    render(<Harness />);
    await waitFor(() => expect(mocked.select).toHaveBeenCalledOnce());
    fireEvent.pointerDown(window);

    await waitFor(() => expect(document.getElementById("ga4-lib")).toBeInstanceOf(HTMLScriptElement));
    expect(document.getElementById("gtm-init")).toBeNull();
    expect(document.getElementById("clarity-init")).toBeNull();
    expect(document.getElementById("fbq-init")).toBeInstanceOf(HTMLScriptElement);
  });

  it("bypasses the known GTM bundle when an administrator changes a provider ID", async () => {
    mocked.preferences = { ...mocked.preferences, resolved: true, analytics: true, marketing: true };
    mocked.select.mockResolvedValueOnce({
      data: [{ key: "ga4_measurement_id", value: "G-ADMIN12345", enabled: true }],
      error: null,
    });

    render(<Harness />);
    await waitFor(() => expect(mocked.select).toHaveBeenCalledOnce());
    fireEvent.pointerDown(window);

    await waitFor(() => expect(document.getElementById("ga4-lib")).toBeInstanceOf(HTMLScriptElement));
    expect(document.getElementById("gtm-init")).toBeNull();
    expect((document.getElementById("ga4-lib") as HTMLScriptElement).src).toContain("G-ADMIN12345");
    expect(document.getElementById("clarity-init")).toBeInstanceOf(HTMLScriptElement);
    expect(document.getElementById("fbq-init")).toBeInstanceOf(HTMLScriptElement);
  });

  it("honors an explicitly configured replacement GTM container", async () => {
    mocked.preferences = { ...mocked.preferences, resolved: true, analytics: true, marketing: true };
    mocked.select.mockResolvedValueOnce({
      data: [{ key: "gtm_container_id", value: "GTM-ADMIN123", enabled: true }],
      error: null,
    });

    render(<Harness />);
    await waitFor(() => expect(mocked.select).toHaveBeenCalledOnce());
    fireEvent.pointerDown(window);

    await waitFor(() => expect(document.getElementById("gtm-init")).toBeInstanceOf(HTMLScriptElement));
    expect(document.getElementById("gtm-init")?.textContent).toContain("GTM-ADMIN123");
    expect(document.getElementById("ga4-lib")).toBeNull();
    expect(document.getElementById("clarity-init")).toBeNull();
    expect(document.getElementById("fbq-init")).toBeNull();
  });

  it("loads configured providers that are not owned by the core GTM bundle", async () => {
    mocked.preferences = { ...mocked.preferences, resolved: true, analytics: true, marketing: true };
    mocked.select.mockResolvedValueOnce({
      data: [
        { key: "google_ads_id", value: "AW-123456789", enabled: true },
        { key: "google_ads_conversion_label", value: "lead-label", enabled: true },
        { key: "hotjar_id", value: "1234567", enabled: true },
        { key: "plausible_domain", value: "sarkari.dekhocampus.com", enabled: true },
      ],
      error: null,
    });

    render(<Harness />);
    await waitFor(() => expect(mocked.select).toHaveBeenCalledOnce());
    fireEvent.pointerDown(window);

    await waitFor(() => expect(document.getElementById("gtm-init")).toBeInstanceOf(HTMLScriptElement));
    expect(document.getElementById("gads-config")?.textContent).toContain("AW-123456789");
    expect(document.getElementById("hj-init")?.textContent).toContain("1234567");
    expect((document.getElementById("plausible") as HTMLScriptElement).dataset.domain).toBe("sarkari.dekhocampus.com");
  });

  it("emits one direct GA page-view per mounted route after direct gtag is active", async () => {
    mocked.preferences = { ...mocked.preferences, resolved: true, analytics: true, marketing: false };
    const library = document.createElement("script");
    library.id = "ga4-lib";
    document.head.appendChild(library);
    const gtag = vi.fn();
    (window as Window & { gtag?: (...args: unknown[]) => void }).gtag = gtag;

    const view = render(<Harness />);
    await waitFor(() => {
      expect(gtag.mock.calls.filter(([kind, name]) => kind === "event" && name === "page_view")).toHaveLength(1);
    });

    fireEvent.click(view.getByRole("button", { name: "Next route" }));
    await waitFor(() => {
      expect(gtag.mock.calls.filter(([kind, name]) => kind === "event" && name === "page_view")).toHaveLength(2);
    });
    expect(((window as Window & { dataLayer?: Array<{ event?: string }> }).dataLayer || [])
      .filter(({ event }) => event === "virtual_page_view")).toHaveLength(2);
  });

  it("buffers exactly one virtual page-view per GTM-owned route without direct provider calls", async () => {
    mocked.preferences = { ...mocked.preferences, resolved: true, analytics: true, marketing: true };
    const gtag = vi.fn();
    const fbq = vi.fn();
    (window as Window & { gtag?: (...args: unknown[]) => void }).gtag = gtag;
    (window as Window & { fbq?: (...args: unknown[]) => void }).fbq = fbq;

    const view = render(<Harness />);
    await waitFor(() => expect(mocked.select).toHaveBeenCalledOnce());
    fireEvent.pointerDown(window);
    await waitFor(() => expect(document.getElementById("gtm-init")).toBeInstanceOf(HTMLScriptElement));

    expect(gtag.mock.calls.filter(([kind, name]) => kind === "event" && name === "page_view")).toHaveLength(0);
    expect(fbq.mock.calls.filter(([kind, name]) => kind === "track" && name === "PageView")).toHaveLength(0);
    fireEvent.click(view.getByRole("button", { name: "Next route" }));
    await waitFor(() => {
      const routeEvents = ((window as Window & { dataLayer?: Array<{ event?: string; page_path?: string }> }).dataLayer || [])
        .filter(({ event }) => event === "virtual_page_view");
      expect(routeEvents).toHaveLength(2);
      expect(routeEvents.map(({ page_path }) => page_path)).toEqual(["/", "/next?from=test"]);
    });
    expect(gtag.mock.calls.filter(([kind, name]) => kind === "event" && name === "page_view")).toHaveLength(0);
    expect(fbq.mock.calls.filter(([kind, name]) => kind === "track" && name === "PageView")).toHaveLength(0);
  });

  it("removes the baked verification tag after an explicit admin disable", async () => {
    mocked.preferences = { ...mocked.preferences, resolved: true };
    mocked.select.mockResolvedValueOnce({
      data: [{ key: "gsc_verification", value: "configured-token", enabled: false }],
      error: null,
    });
    const meta = document.createElement("meta");
    meta.name = "google-site-verification";
    meta.content = "baked-token";
    document.head.appendChild(meta);

    render(<Harness />);
    await waitFor(() => expect(mocked.select).toHaveBeenCalledOnce());
    await waitFor(() => expect(document.querySelector('meta[name="google-site-verification"]')).toBeNull());
  });

  it("removes the Google Ads conversion helper when marketing consent is withdrawn", async () => {
    mocked.preferences = { ...mocked.preferences, resolved: true, analytics: false, marketing: true };
    mocked.select.mockResolvedValueOnce({
      data: [
        { key: "google_ads_id", value: "AW-123456789", enabled: true },
        { key: "google_ads_conversion_label", value: "lead-label", enabled: true },
      ],
      error: null,
    });

    const view = render(<Harness />);
    await waitFor(() => expect(mocked.select).toHaveBeenCalledOnce());
    fireEvent.pointerDown(window);
    await waitFor(() => expect(document.getElementById("gads-helper")).toBeInstanceOf(HTMLScriptElement));
    (window as Window & { fireGoogleAdsConversion?: unknown }).fireGoogleAdsConversion = vi.fn();

    mocked.preferences = { ...mocked.preferences, marketing: false };
    view.rerender(<Harness />);
    await waitFor(() => {
      expect((window as Window & { fireGoogleAdsConversion?: unknown }).fireGoogleAdsConversion).toBeUndefined();
    });
  });
});
