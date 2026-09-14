import { describe, expect, it, vi } from "vitest";
import { renderLegalPrerender } from "@/entry-server";

describe("Sarkari legal streaming SSR", () => {
  it("waits for the lazy route and emits the real legal document", async () => {
    vi.stubGlobal("__APP_BUILD_YEAR__", 2026);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      const markup = await renderLegalPrerender("privacy-policy");
      expect(markup).toMatch(/^(?:<!--\$-->)?<div class="sarkari-site">/);
      expect(markup).toContain("<h1>Privacy Policy</h1>");
      expect(markup).toContain("<article");
      expect(markup).not.toContain("data-msg=");
      expect(markup).not.toContain("PageLoader");
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});
