import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import SarkariLegalPage from "@/pages/SarkariLegalPage";
import { SARKARI_LEGAL_PAGES } from "@/lib/sarkariLegal";

vi.mock("@/components/sarkari/SarkariHeader", () => ({
  SarkariHeader: () => <header data-testid="sarkari-header" />,
}));

vi.mock("@/components/sarkari/SarkariFooter", () => ({
  SarkariFooter: () => <footer data-testid="sarkari-footer" />,
}));

describe("Sarkari legal pages", () => {
  it.each(SARKARI_LEGAL_PAGES)("renders $title at its canonical route", async (page) => {
    render(
      <MemoryRouter initialEntries={[page.path]}>
        <SarkariLegalPage slug={page.slug} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1, name: page.title })).toBeInTheDocument();
    expect(screen.getByText(page.description)).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Legal policies" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: page.shortTitle })).toHaveLength(1);
    expect(screen.getByTestId("sarkari-header")).toBeInTheDocument();
    expect(screen.getByTestId("sarkari-footer")).toBeInTheDocument();

    await waitFor(() => {
      expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
        "href",
        `https://sarkari.dekhocampus.com${page.path}`,
      );
      const jsonLd = document.getElementById("ld-json-page");
      expect(jsonLd).toBeInTheDocument();
      expect(JSON.parse(jsonLd!.textContent || "{}")).toMatchObject({
        "@type": "WebPage",
        name: page.title,
        url: `https://sarkari.dekhocampus.com${page.path}`,
      });
    });
  });

  it("publishes the privacy grievance contact and cookie controls", () => {
    render(
      <MemoryRouter initialEntries={["/legal/privacy-policy"]}>
        <SarkariLegalPage slug="privacy-policy" />
      </MemoryRouter>,
    );

    expect(screen.getByText("Privacy & Grievance Desk")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "outreach@dekhocampus.com" })).toHaveAttribute(
      "href",
      "mailto:outreach@dekhocampus.com",
    );
    expect(screen.getByRole("link", { name: "+91 80103 21712" })).toHaveAttribute(
      "href",
      "tel:+918010321712",
    );
    expect(screen.getByRole("button", { name: "Open cookie settings" })).toBeInTheDocument();
  });
});
