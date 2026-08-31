import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PsychometricTestTool } from "@/components/tools/PsychometricTestTool";

vi.mock("@/components/LeadCaptureForm", () => ({
  LeadCaptureForm: ({ onSuccess }: { onSuccess?: () => void }) => (
    <button type="button" onClick={onSuccess}>Submit lead and continue</button>
  ),
}));

describe("PsychometricTestTool onboarding", () => {
  it("supports every requested student stage", () => {
    render(<PsychometricTestTool />);
    ["Class 9", "Class 10", "Class 11", "Class 12", "Graduation"].forEach((label) => {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    });
  });

  it("requires a student stage and lead step before showing questions", () => {
    render(<PsychometricTestTool />);
    const start = screen.getByRole("button", { name: /Start Psychometric Test/i });
    expect(start).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Class 10" }));
    expect(start).toBeEnabled();
    fireEvent.click(start);

    expect(screen.getByText(/One quick step before your test/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Submit lead and continue/i }));

    expect(screen.getByText(/Question 1 of 18/i)).toBeInTheDocument();
    expect(screen.getByText(/fixing or building things/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Often/i }));
    fireEvent.click(screen.getByRole("button", { name: /Next Question/i }));
    expect(screen.getByText(/Question 2 of 18/i)).toBeInTheDocument();
  });
});
