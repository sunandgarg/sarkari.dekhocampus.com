import { describe, expect, it } from "vitest";
import { getArticleLoadState } from "@/lib/articleLoadState";

describe("getArticleLoadState", () => {
  it("never misclassifies a transient request failure as a missing article", () => {
    expect(getArticleLoadState(false, false, true)).toBe("unavailable");
    expect(getArticleLoadState(false, false, false)).toBe("not-found");
    expect(getArticleLoadState(false, true, false)).toBe("loading");
    expect(getArticleLoadState(true, false, true)).toBe("ready");
  });
});
