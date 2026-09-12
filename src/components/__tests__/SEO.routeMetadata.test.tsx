import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SEO } from "@/components/SEO";
import { useSEO } from "@/hooks/useSEO";

const routeMetaSelectors = [
  'meta[name="keywords"]',
  'meta[name="twitter:image"]',
  'meta[name="twitter:image:alt"]',
  'meta[property="og:image"]',
  'meta[property="og:image:alt"]',
];

afterEach(() => {
  cleanup();
  document.title = "";
  routeMetaSelectors.forEach((selector) => document.querySelector(selector)?.remove());
  document.querySelectorAll("#ld-json-page,#test-response-script").forEach((node) => node.remove());
});

function HookMetadata({ withImage }: { withImage: boolean }) {
  useSEO({
    title: "Article",
    description: "Article description",
    canonical: "/news/article",
    keywords: withImage ? "jobs, results" : undefined,
    ogImage: withImage ? "/article.png" : undefined,
    ogImageAlt: withImage ? "Article image" : undefined,
  });
  return null;
}

function LoadingArticleMetadata() {
  useSEO({ title: "Loading article", enabled: false });
  return null;
}

describe("route SEO metadata ownership", () => {
  it("removes optional component metadata when the next route omits it", async () => {
    const view = render(
      <SEO
        title="First route"
        description="First description"
        keywords="jobs, results"
        ogImage="/first.png"
        ogImageAlt="First image"
      />,
    );
    await waitFor(() => expect(document.querySelector('meta[property="og:image"]')).not.toBeNull());

    view.rerender(<SEO title="Second route" description="Second description" />);

    await waitFor(() => {
      routeMetaSelectors.forEach((selector) => expect(document.querySelector(selector)).toBeNull());
    });
  });

  it("removes optional hook metadata when the next route omits it", async () => {
    const view = render(<HookMetadata withImage />);
    await waitFor(() => expect(document.querySelector('meta[property="og:image"]')).not.toBeNull());

    view.rerender(<HookMetadata withImage={false} />);

    await waitFor(() => {
      routeMetaSelectors.forEach((selector) => expect(document.querySelector(selector)).toBeNull());
    });
  });

  it("preserves the response nonce when replacing structured data under strict CSP", async () => {
    const bootstrap = document.createElement("script");
    bootstrap.id = "test-response-script";
    bootstrap.nonce = "response-nonce";
    document.head.appendChild(bootstrap);

    render(<SEO title="Structured article" jsonLd={{ "@type": "NewsArticle" }} />);
    await waitFor(() => expect(document.getElementById("ld-json-page")).not.toBeNull());
    expect((document.getElementById("ld-json-page") as HTMLScriptElement).nonce).toBe("response-nonce");
  });

  it("does not erase edge-rendered article metadata while client data is loading", () => {
    document.title = "Edge article | Sarkari DekhoCampus";
    const schema = document.createElement("script");
    schema.id = "ld-json-page";
    schema.type = "application/ld+json";
    schema.nonce = "edge-nonce";
    schema.textContent = '{"@type":"NewsArticle"}';
    document.head.appendChild(schema);

    render(<LoadingArticleMetadata />);
    expect(document.title).toBe("Edge article | Sarkari DekhoCampus");
    expect(document.getElementById("ld-json-page")?.textContent).toContain("NewsArticle");
  });
});
