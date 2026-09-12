import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const buildId =
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  `local-${Date.now().toString(36)}`;
const configuredBuildYear = Number(process.env.SARKARI_BUILD_YEAR);
const buildYear = Number.isInteger(configuredBuildYear) && configuredBuildYear >= 2026
  ? configuredBuildYear
  : new Date().getUTCFullYear();

const emitBuildVersionPlugin: Plugin = {
  name: "emit-build-version",
  generateBundle() {
    this.emitFile({
      type: "asset",
      fileName: "version.json",
      source: JSON.stringify({ buildId, buildYear }),
    });
  },
};

const prioritizeStylesPlugin: Plugin = {
  name: "prioritize-entry-styles",
  enforce: "post",
  transformIndexHtml: {
    order: "post",
    handler(html) {
      const styles = html.match(/<link rel="stylesheet"[^>]*>/g) || [];
      if (!styles.length) return html;
      const withoutStyles = styles.reduce((result, tag) => result.replace(tag, ""), html);
      const firstModulePreload = withoutStyles.indexOf('<link rel="modulepreload"');
      if (firstModulePreload < 0) return html;
      return `${withoutStyles.slice(0, firstModulePreload)}${styles.join("\n  ")}\n  ${withoutStyles.slice(firstModulePreload)}`;
    },
  },
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    emitBuildVersionPlugin,
    prioritizeStylesPlugin,
  ].filter(Boolean),
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildId),
    __APP_BUILD_YEAR__: JSON.stringify(buildYear),
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    minify: "esbuild",
    chunkSizeWarningLimit: 1200,
  },
  // A tiny, explicitly uncached marker lets an already-open tab notice a new
  // deployment without interrupting the page or any operation in progress.
  publicDir: "public",
}));
