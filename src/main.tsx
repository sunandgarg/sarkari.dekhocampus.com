import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import {
  hasHydratableHomePrerender,
  HOME_PRERENDER_ATTRIBUTE,
  HOME_PRERENDER_IDENTIFIER_PREFIX,
} from "./lib/homePrerender";
import { installChunkRecovery } from "./lib/lazyRetry";

installChunkRecovery();
const root = document.getElementById("root");
if (!root) throw new Error("Sarkari application root is missing");

if (hasHydratableHomePrerender(root, window.location)) {
  root.removeAttribute(HOME_PRERENDER_ATTRIBUTE);
  hydrateRoot(root, <App />, { identifierPrefix: HOME_PRERENDER_IDENTIFIER_PREFIX });
} else {
  // The inline document guard clears query and non-home routes before paint.
  // Repeat that invariant here so development and malformed shells fail safe.
  root.replaceChildren();
  root.removeAttribute(HOME_PRERENDER_ATTRIBUTE);
  createRoot(root, { identifierPrefix: HOME_PRERENDER_IDENTIFIER_PREFIX }).render(<App />);
}
