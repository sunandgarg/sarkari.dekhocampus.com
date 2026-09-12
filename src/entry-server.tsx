import { QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { AppRuntime, createAppQueryClient } from "./App";
import { HOME_PRERENDER_IDENTIFIER_PREFIX } from "./lib/homePrerender";

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
