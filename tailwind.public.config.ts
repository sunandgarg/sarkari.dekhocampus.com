import type { Config } from "tailwindcss";
import baseConfig from "./tailwind.config";
import { publicContent } from "./tailwind.public-content.mjs";
import { AD_GRADIENT_CLASSES } from "./src/lib/adGradients";

/**
 * Tailwind entry points for the public Sarkari application.
 *
 * The repository intentionally retains the wider DekhoCampus source tree so it
 * can share components and design tokens. The deployed application, however,
 * only exposes the routes and lazy integrations rooted at src/main.tsx. Keeping
 * this list aligned with that import graph prevents private/admin utilities from
 * being shipped in the public, render-blocking stylesheet.
 */
export default {
  ...baseConfig,
  theme: {
    ...baseConfig.theme,
    extend: {
      ...baseConfig.theme.extend,
      colors: {
        ...baseConfig.theme.extend.colors,
        // DekhoCampus defines `pink` as a semantic single-value token, which
        // replaces Tailwind's numbered pink scale. Preserve that token while
        // restoring the one legacy admin-gradient stop accepted by the API.
        pink: {
          DEFAULT: "hsl(var(--pink))",
          500: "#ec4899",
        },
      },
    },
  },
  // DynamicAdBanner receives one of these exact admin-controlled class pairs
  // from the database, so Tailwind cannot discover them from interpolation.
  safelist: [...(baseConfig.safelist || []), ...AD_GRADIENT_CLASSES],
  content: {
    relative: true,
    files: publicContent,
  },
} satisfies Config;
