import { describe, expect, it } from "vitest";
import { compactEntityLabel } from "@/lib/compactEntityLabel";

describe("compactEntityLabel", () => {
  it("keeps short exam names unchanged", () => {
    expect(compactEntityLabel("XAT")).toBe("XAT");
  });

  it("uses at most the first three words", () => {
    expect(compactEntityLabel("West Bengal Joint Entrance Examination")).toBe("West Bengal Joint");
  });

  it("normalizes extra whitespace", () => {
    expect(compactEntityLabel("  B.Tech   Computer Science   Engineering ")).toBe("B.Tech Computer Science");
  });
});
