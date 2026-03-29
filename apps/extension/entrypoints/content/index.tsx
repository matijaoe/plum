import "./style.css";
import { createRoot } from "react-dom/client";
import { extractArticleFromDom } from "@plum/core";
import { ReaderOverlay } from "../../components/reader-overlay";

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Geist+Mono:wght@100..900&family=Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900&display=swap";

function injectGoogleFonts() {
  if (document.querySelector(`link[href*="fonts.googleapis.com"][data-plum]`)) {
    return;
  }
  const preconnect1 = document.createElement("link");
  preconnect1.rel = "preconnect";
  preconnect1.href = "https://fonts.googleapis.com";
  preconnect1.setAttribute("data-plum", "");

  const preconnect2 = document.createElement("link");
  preconnect2.rel = "preconnect";
  preconnect2.href = "https://fonts.gstatic.com";
  preconnect2.crossOrigin = "anonymous";
  preconnect2.setAttribute("data-plum", "");

  const fonts = document.createElement("link");
  fonts.rel = "stylesheet";
  fonts.href = GOOGLE_FONTS_URL;
  fonts.setAttribute("data-plum", "");

  document.head.append(preconnect1, preconnect2, fonts);
}

export default defineContentScript({
  matches: ["*://*/*"],
  cssInjectionMode: "ui",

  async main(ctx) {
    // Listen for activation message from background
    browser.runtime.onMessage.addListener(async (msg) => {
      if (msg.type !== "activate-reader") {
        return;
      }

      // Parse the current page
      const doc = document.cloneNode(true) as Document;
      const article = extractArticleFromDom(doc, location.href);
      if (!article) {
        console.warn("[Plum] Could not parse article from this page.");
        return;
      }

      injectGoogleFonts();

      // Create shadow root UI
      const ui = await createShadowRootUi(ctx, {
        name: "plum-reader",
        position: "overlay",
        zIndex: 2147483647,
        onMount(container) {
          const wrapper = document.createElement("div");
          wrapper.id = "plum-root";
          container.append(wrapper);

          const root = createRoot(wrapper);
          root.render(
            <ReaderOverlay
              article={article}
              sourceUrl={location.href}
              shadowHost={container.parentElement!}
              onExit={() => ui.remove()}
            />,
          );
          return root;
        },
        onRemove(root) {
          root?.unmount();
        },
      });

      ui.mount();
    });
  },
});
