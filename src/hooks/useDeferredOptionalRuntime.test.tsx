import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_RESOLVED_EVENT, COOKIE_SETTINGS_OPEN_EVENT } from "@/lib/promptSequence";
import { useDeferredOptionalRuntime } from "./useDeferredOptionalRuntime";

function RuntimeState() {
  const state = useDeferredOptionalRuntime();
  return (
    <output data-testid="runtime-state">
      {JSON.stringify(state)}
    </output>
  );
}

describe("useDeferredOptionalRuntime", () => {
  let idleCallbacks: Array<() => void>;

  beforeEach(() => {
    localStorage.clear();
    idleCallbacks = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("requestIdleCallback", (callback: () => void) => {
      idleCallbacks.push(callback);
      return idleCallbacks.length;
    });
    vi.stubGlobal("cancelIdleCallback", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("mounts consent after idle but waits for a consent decision before services", () => {
    render(<RuntimeState />);
    expect(screen.getByTestId("runtime-state")).toHaveTextContent('"showCookieConsent":false');
    expect(screen.getByTestId("runtime-state")).toHaveTextContent('"showConsentedServices":false');

    act(() => idleCallbacks.shift()?.());
    expect(screen.getByTestId("runtime-state")).toHaveTextContent('"showCookieConsent":true');
    expect(screen.getByTestId("runtime-state")).toHaveTextContent('"showConsentedServices":false');

    act(() => window.dispatchEvent(new Event(COOKIE_RESOLVED_EVENT)));
    expect(screen.getByTestId("runtime-state")).toHaveTextContent('"showConsentedServices":false');
    act(() => idleCallbacks.shift()?.());
    expect(screen.getByTestId("runtime-state")).toHaveTextContent('"showConsentedServices":true');
  });

  it("mounts immediately and preserves an early cookie-settings request", () => {
    render(<RuntimeState />);
    act(() => window.dispatchEvent(new Event(COOKIE_SETTINGS_OPEN_EVENT)));
    expect(screen.getByTestId("runtime-state")).toHaveTextContent('"showCookieConsent":true');
    expect(screen.getByTestId("runtime-state")).toHaveTextContent('"openCookieSettingsOnMount":true');
  });

  it("defers services for visitors with an existing decision", () => {
    localStorage.setItem("dc_cookie_consent_v1", "essential");
    render(<RuntimeState />);
    expect(idleCallbacks).toHaveLength(2);
    expect(screen.getByTestId("runtime-state")).toHaveTextContent('"showConsentedServices":false');
    act(() => idleCallbacks.forEach((callback) => callback()));
    expect(screen.getByTestId("runtime-state")).toHaveTextContent('"showConsentedServices":true');
  });
});
