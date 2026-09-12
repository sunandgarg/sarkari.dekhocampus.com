import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FAQSection } from "@/components/FAQSection";

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: [{ id: "faq-1", question: "When can I apply?", answer: "Check the official notification." }],
  }),
}));

describe("FAQSection strict CSP", () => {
  afterEach(() => document.querySelectorAll("#test-response-script,[id^='faq-jsonld-']").forEach((node) => node.remove()));

  it("copies the response nonce to dynamically generated FAQ structured data", async () => {
    const bootstrap = document.createElement("script");
    bootstrap.id = "test-response-script";
    bootstrap.nonce = "response-nonce";
    document.head.appendChild(bootstrap);

    render(<FAQSection page="sarkari_articles" itemSlug="railway-job" />);
    await waitFor(() => expect(document.getElementById("faq-jsonld-sarkari_articles-railway-job")).not.toBeNull());
    expect((document.getElementById("faq-jsonld-sarkari_articles-railway-job") as HTMLScriptElement).nonce).toBe("response-nonce");
  });
});
