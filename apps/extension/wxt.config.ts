import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Plugin = any;

/**
 * Prevent Shiki's Oniguruma WASM engine from being bundled.
 * The extension uses Shiki's pure-JS regex engine instead.
 */
function excludeOniguruma(): Plugin {
  return {
    name: "exclude-oniguruma",
    resolveId(id: string) {
      if (id.includes("@shikijs/engine-oniguruma") || id.includes("oniguruma-to-es")) {
        return "\0noop-oniguruma";
      }
    },
    load(id: string) {
      if (id === "\0noop-oniguruma") {
        return "export default {}; export function createOnigurumaEngine() { throw new Error('Not available'); }";
      }
    },
  };
}

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Plum Reader",
    description: "Distraction-free reader mode for any page",
    permissions: ["activeTab", "scripting", "storage"],
    action: {},
    web_accessible_resources: [
      { resources: ["reader.html", "chunks/*", "assets/*"], matches: ["*://*/*"] },
    ],
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vite: () =>
    ({
      plugins: [tailwindcss(), excludeOniguruma()],
      resolve: {
        alias: {
          "@plum/core": new URL("../../packages/core/src", import.meta.url).pathname,
          "@plum/core/styles.css": new URL("../../packages/core/src/index.css", import.meta.url)
            .pathname,
        },
      },
    }) as any,
});
