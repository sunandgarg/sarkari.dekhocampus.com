import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { SARKARI_LEGAL_PAGES } from "@/lib/sarkariLegal";

beforeAll(() => vi.stubGlobal("__APP_BUILD_YEAR__", 2026));
afterAll(() => vi.unstubAllGlobals());

describe("SarkariFooter legal and support links", () => {
  it("links every legal page and the published support contacts", async () => {
    const { SarkariFooter } = await import("@/components/sarkari/SarkariFooter");
    render(<MemoryRouter><SarkariFooter /></MemoryRouter>);

    for (const page of SARKARI_LEGAL_PAGES) {
      expect(screen.getByRole("link", { name: page.shortTitle })).toHaveAttribute("href", page.path);
    }
    expect(screen.getByRole("link", { name: "outreach@dekhocampus.com" })).toHaveAttribute(
      "href",
      "mailto:outreach@dekhocampus.com",
    );
    expect(screen.getByRole("link", { name: "+91 80103 21712" })).toHaveAttribute(
      "href",
      "tel:+918010321712",
    );
    expect(screen.getByRole("button", { name: "Cookie settings" })).toBeInTheDocument();
  });
});
