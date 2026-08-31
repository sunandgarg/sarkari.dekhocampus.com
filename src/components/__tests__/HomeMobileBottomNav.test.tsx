import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeMobileBottomNav } from "@/components/HomeMobileBottomNav";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null }),
}));

describe("HomeMobileBottomNav scroll direction", () => {
  let y = 0;

  beforeEach(() => {
    y = 0;
    Object.defineProperty(window, "scrollY", { configurable: true, get: () => y });
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => window.setTimeout(() => callback(0), 0));
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => window.clearTimeout(id));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.classList.remove("dc-mobile-bottom-nav-visible");
  });

  const moveTo = async (nextY: number) => {
    y = nextY;
    window.dispatchEvent(new Event("scroll"));
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 5));
    });
  };

  it("stays hidden while scrolling down and appears after two upward movements", async () => {
    render(<MemoryRouter><HomeMobileBottomNav /></MemoryRouter>);
    const nav = screen.getByRole("navigation", { name: "Mobile navigation" });

    await moveTo(120);
    await moveTo(220);
    expect(nav).toHaveClass("translate-y-full");

    await moveTo(190);
    expect(nav).toHaveClass("translate-y-full");

    await moveTo(155);
    expect(nav).toHaveClass("translate-y-0");
    expect(document.body).toHaveClass("dc-mobile-bottom-nav-visible");

    await moveTo(180);
    expect(nav).toHaveClass("translate-y-full");
  });
});
