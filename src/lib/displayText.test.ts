import { describe, expect, it } from "vitest";
import { compactDisplayText, displayText, stripMarkup } from "./displayText";

describe("displayText", () => {
  it("turns legacy category JSON into readable labels", () => {
    expect(displayText('[{"Cat_id":1,"Cat_name":"Engineering"}]')).toBe("Engineering");
  });

  it("strips HTML from scalar display fields", () => {
    expect(stripMarkup("<p>The <strong>Course Level</strong> is undergraduate.</p>")).toBe("The Course Level is undergraduate.");
  });

  it("compacts long labels", () => {
    expect(compactDisplayText("Xavier Aptitude Test Video", "-", 12)).toBe("Xavier Apti...");
  });
});
