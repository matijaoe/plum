import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Plum Reader",
    description: "Distraction-free reader mode for any page",
    permissions: ["activeTab", "scripting"],
    action: {},
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vite: () =>
    ({
      plugins: [tailwindcss()],
      resolve: {
        alias: {
          "@plum/core": new URL("../../packages/core/src", import.meta.url).pathname,
          "@plum/core/styles.css": new URL("../../packages/core/src/index.css", import.meta.url)
            .pathname,
        },
      },
    }) as any,
});
