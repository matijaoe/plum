import { SHIKI_FALLBACK_LANGUAGE, SHIKI_THEMES } from "./shiki";

function getCodeBlocks(container: HTMLElement): NodeListOf<Element> {
  return container.querySelectorAll("pre > code");
}

function waitForCodeBlocks(
  container: HTMLElement,
  signal: AbortSignal,
): Promise<NodeListOf<Element> | null> {
  if (signal.aborted) {
    return Promise.resolve(null);
  }

  const blocks = getCodeBlocks(container);
  if (blocks.length > 0) {
    return Promise.resolve(blocks);
  }

  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      const found = getCodeBlocks(container);
      if (found.length > 0) {
        observer.disconnect();
        resolve(found);
      }
    });

    signal.addEventListener("abort", () => {
      observer.disconnect();
      resolve(null);
    });

    observer.observe(container, { childList: true, subtree: true });
  });
}

export async function highlightCodeBlocks(
  container: HTMLElement,
  signal: AbortSignal,
  customCodeToHtml?: (
    code: string,
    options: { lang: string; themes: Record<string, string> },
  ) => Promise<string>,
): Promise<void> {
  const blocks = await waitForCodeBlocks(container, signal);
  if (!blocks || signal.aborted) {
    return;
  }

  const codeToHtml = customCodeToHtml ?? (await import("shiki")).codeToHtml;

  for (const code of blocks) {
    if (signal.aborted) {
      return;
    }

    const pre = code.parentElement as HTMLElement;
    const lang = [...code.classList]
      .find((c) => c.startsWith("language-"))
      ?.replace("language-", "");

    if (lang) {
      pre.dataset.language = lang;
    }

    const text = code.textContent ?? "";
    try {
      const html = await codeToHtml(text, {
        lang: lang?.toLowerCase() ?? SHIKI_FALLBACK_LANGUAGE,
        themes: SHIKI_THEMES,
      });
      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;
      const newPre = wrapper.querySelector("pre");
      if (newPre) {
        if (lang) {
          newPre.dataset.language = lang;
        }
        pre.replaceWith(newPre);
      }
    } catch (err) {
      console.error("Shiki highlight failed:", lang, err);
    }
  }
}
