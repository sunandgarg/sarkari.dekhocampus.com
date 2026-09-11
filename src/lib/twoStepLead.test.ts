import { afterEach, describe, expect, it, vi } from "vitest";
import { saveLeadPhase } from "./twoStepLead";

afterEach(() => vi.unstubAllGlobals());

describe("saveLeadPhase consent boundary", () => {
  it("rejects before making a network request when consent is absent", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(saveLeadPhase({ name: "A Candidate" })).rejects.toThrow("consent is required");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends an explicitly consented lead", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, lead_id: "lead-1", phase: "identity" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(saveLeadPhase({ name: "A Candidate", consent_terms_accepted: true })).resolves.toMatchObject({ lead_id: "lead-1" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
