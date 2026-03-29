const READER_HOST_ID = "reader-host";
const READER_FRAME_ID = "reader-frame";
const PREVIOUS_HTML_OVERFLOW = "previousHtmlOverflow";
const PREVIOUS_BODY_OVERFLOW = "previousBodyOverflow";
const READER_CLEANUP_KEY = "__readerCleanup";

export default defineBackground(() => {
  browser.action.onClicked.addListener(async (tab) => {
    if (!tab.id || !tab.url) {
      return;
    }

    // Toggle: if reader is already open, close it
    const [{ result: alreadyOpen }] = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: (
        hostId: string,
        previousHtmlOverflowKey: string,
        previousBodyOverflowKey: string,
        cleanupKey: string,
      ) => {
        const existingCleanup = (window as unknown as Record<string, (() => void) | undefined>)[
          cleanupKey
        ];
        if (existingCleanup) {
          existingCleanup();
          return true;
        }

        const existing = document.getElementById(hostId);
        if (existing) {
          document.documentElement.style.overflow = existing.dataset[previousHtmlOverflowKey] ?? "";
          document.body.style.overflow = existing.dataset[previousBodyOverflowKey] ?? "";
          existing.remove();
          return true;
        }
        return false;
      },
      args: [READER_HOST_ID, PREVIOUS_HTML_OVERFLOW, PREVIOUS_BODY_OVERFLOW, READER_CLEANUP_KEY],
    });

    if (alreadyOpen) {
      return;
    }

    // Capture the page HTML with a tiny injected function
    const [result] = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.documentElement.outerHTML,
    });

    if (!result?.result) {
      return;
    }

    // Store article data in session storage (avoids URL length limits)
    const readerId = crypto.randomUUID();
    await browser.storage.session.set({
      [`reader-${readerId}`]: { html: result.result as string, sourceUrl: tab.url },
    });

    // Inject a fullscreen iframe overlay on the page
    const readerUrl = browser.runtime.getURL(`/reader.html?id=${readerId}`);
    const [{ result: opened }] = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: (
        url: string,
        hostId: string,
        frameId: string,
        previousHtmlOverflowKey: string,
        previousBodyOverflowKey: string,
        cleanupKey: string,
      ) => {
        const previousHtmlOverflow = document.documentElement.style.overflow;
        const previousBodyOverflow = document.body.style.overflow;
        const expectedOrigin = new URL(url).origin;

        const host = document.createElement("div");
        host.id = hostId;
        host.dataset[previousHtmlOverflowKey] = previousHtmlOverflow;
        host.dataset[previousBodyOverflowKey] = previousBodyOverflow;
        host.style.cssText = "position:fixed;inset:0;z-index:2147483647;";

        const iframe = document.createElement("iframe");
        iframe.id = frameId;
        iframe.src = url;
        iframe.allow = "clipboard-write";
        iframe.style.cssText =
          "display:block;width:100%;height:100%;border:none;background:transparent;";
        host.appendChild(iframe);

        const cleanup = () => {
          window.removeEventListener("message", onMessage);
          host.remove();
          document.documentElement.style.overflow = previousHtmlOverflow;
          document.body.style.overflow = previousBodyOverflow;
          delete (window as unknown as Record<string, unknown>)[cleanupKey];
        };

        const onMessage = (event: MessageEvent) => {
          if (event.source !== iframe.contentWindow || event.origin !== expectedOrigin) {
            return;
          }

          if (event.data?.type === "reader-exit") {
            cleanup();
          }
        };

        window.addEventListener("message", onMessage);
        (window as unknown as Record<string, unknown>)[cleanupKey] = cleanup;
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
        document.documentElement.appendChild(host);
        return true;
      },
      args: [
        readerUrl,
        READER_HOST_ID,
        READER_FRAME_ID,
        PREVIOUS_HTML_OVERFLOW,
        PREVIOUS_BODY_OVERFLOW,
        READER_CLEANUP_KEY,
      ],
    });

    if (!opened) {
      await browser.storage.session.remove(`reader-${readerId}`);
    }
  });
});
