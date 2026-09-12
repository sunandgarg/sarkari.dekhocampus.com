import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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
    from: () => ({ select: mocked.select }),
  },
}));

function Harness() {
  return <MemoryRouter><SiteIntegrations /></MemoryRouter>;
}

describe("SiteIntegrations consent boundary", () => {
  beforeEach(() => {
    mocked.preferences = { resolved: false, essential: true, prefill: false, analytics: false, marketing: false };
    mocked.select.mockReset().mockResolvedValue({ data: [], error: null });
    document.querySelectorAll("#gtm-init,script[src*='googletagmanager.com']").forEach((node) => node.remove());
  });

  it("does not even resolve optional integrations before a cookie choice", async () => {
    render(<Harness />);
    await Promise.resolve();
    expect(mocked.select).not.toHaveBeenCalled();
    expect(document.getElementById("gtm-init")).toBeNull();
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
});
