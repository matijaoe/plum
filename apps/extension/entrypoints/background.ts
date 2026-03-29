const READER_HOST_ID = "reader-host";

export default defineBackground(() => {
  // Handle exit request from the reader iframe
  browser.runtime.onMessage.addListener((msg, sender) => {
    if (msg.type === "reader-exit" && sender.tab?.id) {
      void browser.scripting.executeScript({
        target: { tabId: sender.tab.id },
        func: (hostId: string) => {
          document.getElementById(hostId)?.remove();
          document.documentElement.style.overflow = "";
          document.body.style.overflow = "";
        },
        args: [READER_HOST_ID],
      });
    }
  });

  browser.action.onClicked.addListener(async (tab) => {
    if (!tab.id || !tab.url) {
      return;
    }

    // Toggle: if reader is already open, close it
    const [{ result: alreadyOpen }] = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: (hostId: string) => {
        const existing = document.getElementById(hostId);
        if (existing) {
          existing.remove();
          document.documentElement.style.overflow = "";
          document.body.style.overflow = "";
          return true;
        }
        return false;
      },
      args: [READER_HOST_ID],
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
    const readerUrl = new URL(browser.runtime.getURL("/reader.html"));
    readerUrl.searchParams.set("id", readerId);
    const [{ result: opened }] = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: (url: string, hostId: string) => {
        const host = document.createElement("div");
        host.id = hostId;
        host.style.cssText = "position:fixed;inset:0;z-index:2147483647;";

        const iframe = document.createElement("iframe");
        iframe.src = url;
        iframe.allow = "clipboard-write";
        iframe.style.cssText =
          "display:block;width:100%;height:100%;border:none;background:transparent;";
        host.appendChild(iframe);

        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
        document.documentElement.appendChild(host);
        return true;
      },
      args: [readerUrl.toString(), READER_HOST_ID],
    });

    if (!opened) {
      await browser.storage.session.remove(`reader-${readerId}`);
    }
  });
});
