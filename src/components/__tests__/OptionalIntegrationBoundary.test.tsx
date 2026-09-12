import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OptionalIntegrationBoundary } from "@/components/OptionalIntegrationBoundary";

function BrokenIntegration(): never {
  throw new Error("optional chunk failed");
}

describe("OptionalIntegrationBoundary", () => {
  it("contains an optional integration failure without unmounting the page", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <>
        <main>Public page remains available</main>
        <OptionalIntegrationBoundary name="test-integration">
          <BrokenIntegration />
        </OptionalIntegrationBoundary>
      </>,
    );
    expect(screen.getByText("Public page remains available")).toBeInTheDocument();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
