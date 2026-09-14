import { QueryClientProvider } from "@tanstack/react-query";
import { PassThrough } from "node:stream";
import { renderToPipeableStream, renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { AppRuntime, createAppQueryClient } from "./App";
import {
  HOME_PRERENDER_IDENTIFIER_PREFIX,
  LEGAL_PRERENDER_IDENTIFIER_PREFIX,
} from "./lib/homePrerender";
import type { SarkariLegalSlug } from "./lib/sarkariLegal";

/** Render only the deterministic, unfiltered homepage state used at build time. */
export function renderHomePrerender() {
  const queryClient = createAppQueryClient();
  try {
    return renderToString(
      <QueryClientProvider client={queryClient}>
        <StaticRouter location="/">
          <AppRuntime />
        </StaticRouter>
      </QueryClientProvider>,
      { identifierPrefix: HOME_PRERENDER_IDENTIFIER_PREFIX },
    );
  } finally {
    queryClient.clear();
  }
}

/** Render one deterministic legal page for its route-specific crawlable shell. */
export function renderLegalPrerender(slug: SarkariLegalSlug) {
  const queryClient = createAppQueryClient();
  const markup = new Promise<string>((resolve, reject) => {
    const destination = new PassThrough();
    const chunks: string[] = [];
    let renderError: unknown;
    let settled = false;

    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      request.abort();
      reject(error);
    };

    destination.setEncoding("utf8");
    destination.on("data", (chunk: string) => chunks.push(chunk));
    destination.on("error", fail);
    destination.on("end", () => {
      if (renderError) {
        fail(renderError);
        return;
      }
      if (settled) return;
      settled = true;
      resolve(chunks.join(""));
    });

    const request = renderToPipeableStream(
      <QueryClientProvider client={queryClient}>
        <StaticRouter location={`/legal/${slug}`}>
          <AppRuntime />
        </StaticRouter>
      </QueryClientProvider>,
      {
        identifierPrefix: LEGAL_PRERENDER_IDENTIFIER_PREFIX,
        onAllReady() {
          request.pipe(destination);
        },
        onShellError: fail,
        onError(error) {
          renderError ??= error;
        },
      },
    );
  });

  return markup.finally(() => queryClient.clear());
}
