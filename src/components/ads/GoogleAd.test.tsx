import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleAd, resetAdPageLimitRegistryForTests } from "@/components/ads/GoogleAd";
import type { AdUnit } from "@/hooks/useAdsense";

const adMocks = vi.hoisted(() => ({
  eligibility: {} as Record<string, any>,
  unit: {} as AdUnit,
  unitOptions: [] as Array<Record<string, unknown>>,
  insert: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/hooks/useAdsense", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useAdsense")>();
  return {
    ...actual,
    useAdsEligibility: () => adMocks.eligibility,
    useAdUnits: (options: Record<string, unknown>) => {
      adMocks.unitOptions.push(options);
      return { data: options.enabled ? [adMocks.unit] : [] };
    },
  };
});

vi.mock("@/integrations/backend/client", () => ({
  backendClient: { from: adMocks.from },
}));

const makeUnit = (overrides: Partial<AdUnit> = {}): AdUnit => ({
  id: "unit-1",
  name: "Homepage top",
  ad_type: "display",
  placement: "homepage",
  position: "top",
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

function resetEligibility() {
  adMocks.eligibility = {
    allowed: true,
    consentGranted: true,
    settingsReady: true,
    settings: null,
    runtime: {
      ready: true,
      globallyEnabled: true,
      clientId: "ca-pub-4858806955717066",
      autoAdsEnabled: true,
      usingFallbackIdentity: true,
      adsPerPageLimit: 0,
      lazyLoadEnabled: false,
    },
    viewportWidth: 1440,
    device: "desktop",
    path: "/",
    roles: ["guest"],
  };
}

describe("GoogleAd", () => {
  beforeEach(() => {
    resetAdPageLimitRegistryForTests();
    resetEligibility();
    adMocks.unit = makeUnit();
    adMocks.unitOptions = [];
    adMocks.insert.mockReset();
    adMocks.insert.mockResolvedValue({ data: null, error: null });
    adMocks.from.mockReset();
    adMocks.from.mockReturnValue({ insert: adMocks.insert });
    delete (window as Window & { adsbygoogle?: unknown }).adsbygoogle;
  });

  afterEach(() => {
    cleanup();
    resetAdPageLimitRegistryForTests();
    delete (window as Window & { adsbygoogle?: unknown }).adsbygoogle;
  });

  it("queues a visible manual slot before the deferred library is available", async () => {
    const view = render(<GoogleAd placement="homepage" position="top" pageKey="homepage" />);

    const slot = view.getByRole("complementary", { name: "Advertisement" });
    expect(slot).toHaveStyle({ minHeight: "250px" });
    expect(slot.querySelector(".sarkari-ad-label")).toHaveTextContent("Advertisement");
    expect(slot.querySelector("ins.adsbygoogle")).toHaveAttribute("data-ad-client", "ca-pub-4858806955717066");
    await waitFor(() => expect((window as Window & { adsbygoogle?: unknown[] }).adsbygoogle).toHaveLength(1));
    expect(adMocks.insert).toHaveBeenCalledWith(expect.objectContaining({ event_type: "slot_request" }));

    fireEvent.click(slot);
    expect(adMocks.insert).toHaveBeenCalledTimes(1);
  });

  it("does not query units or render markup when eligibility is denied", () => {
    adMocks.eligibility = { ...adMocks.eligibility, allowed: false, consentGranted: false };
    const view = render(<GoogleAd placement="homepage" position="top" pageKey="homepage" />);

    expect(view.queryByRole("complementary", { name: "Advertisement" })).toBeNull();
    expect(adMocks.unitOptions.at(-1)).toEqual({ enabled: false });
    expect((window as Window & { adsbygoogle?: unknown[] }).adsbygoogle).toBeUndefined();
  });

  it("collapses an incomplete custom unit instead of reserving an empty ad box", () => {
    adMocks.unit = makeUnit({ ad_type: "custom", custom_html: "", ad_slot_id: "" });
    const view = render(<GoogleAd placement="homepage" position="top" pageKey="homepage" />);

    expect(view.queryByRole("complementary", { name: "Advertisement" })).toBeNull();
    expect((window as Window & { adsbygoogle?: unknown[] }).adsbygoogle).toBeUndefined();
  });

  it("uses reference-sized reserves when a real unit has no custom height", () => {
    adMocks.unit = makeUnit({ min_height: null });
    const top = render(<GoogleAd placement="homepage" position="top" pageKey="homepage" />);
    expect(top.getByRole("complementary", { name: "Advertisement" })).toHaveStyle({ minHeight: "250px" });
    top.unmount();

    adMocks.unit = makeUnit({ id: "unit-2", position: "bottom", min_height: null });
    const bottom = render(<GoogleAd placement="homepage" position="bottom" pageKey="homepage" />);
    expect(bottom.getByRole("complementary", { name: "Advertisement" })).toHaveStyle({ minHeight: "280px" });
  });

  it("enforces the configured manual-slot limit for a page", async () => {
    adMocks.eligibility = {
      ...adMocks.eligibility,
      runtime: { ...adMocks.eligibility.runtime, adsPerPageLimit: 1 },
    };
    const view = render(<>
      <GoogleAd placement="homepage" position="top" pageKey="homepage" />
      <GoogleAd placement="homepage" position="top" pageKey="homepage-secondary" />
    </>);

    await waitFor(() => expect(view.getAllByRole("complementary", { name: "Advertisement" })).toHaveLength(1));
    await waitFor(() => expect(adMocks.insert).toHaveBeenCalledTimes(1));
    expect((window as Window & { adsbygoogle?: unknown[] }).adsbygoogle).toHaveLength(1);
  });
});
