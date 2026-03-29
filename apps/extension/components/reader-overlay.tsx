import { ArrowSquareOut, X } from "@phosphor-icons/react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { ThemeProvider } from "next-themes";
import { useCallback, useMemo } from "react";
import {
  ReaderProvider,
  ReaderView,
  SHIKI_FALLBACK_LANGUAGE,
  SHIKI_THEME_VALUES,
  useReaderContext,
  type Article,
  type CodeToHtmlFn,
  type MobileDrawerAction,
} from "@plum/core";

const WEB_APP_URL = (import.meta.env.WXT_WEB_APP_URL as string) ?? "https://plum-reader.vercel.app";

interface ReaderOverlayProps {
  article: Article;
  sourceUrl: string;
  onExit: () => void;
}

export function ReaderOverlay({ article, sourceUrl, onExit }: ReaderOverlayProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ReaderOverlayInner article={article} sourceUrl={sourceUrl} onExit={onExit} />
    </ThemeProvider>
  );
}

function ReaderOverlayInner({ article, sourceUrl, onExit }: ReaderOverlayProps) {
  const codeToHtml = useMemo<CodeToHtmlFn>(() => {
    type LoadedHighlighter = {
      loadLanguage: (lang: string) => Promise<void>;
      getLoadedLanguages: () => string[];
      codeToHtml: CodeToHtmlFn;
    };

    let highlighterPromise: Promise<LoadedHighlighter> | null = null;

    async function getHighlighter() {
      if (!highlighterPromise) {
        highlighterPromise = Promise.all([import("shiki"), import("shiki/engine/javascript")]).then(
          async ([{ createHighlighter }, { createJavaScriptRegexEngine }]) => {
            const highlighter = await createHighlighter({
              themes: [...SHIKI_THEME_VALUES],
              langs: [],
              engine: createJavaScriptRegexEngine(),
            });

            return {
              loadLanguage: async (lang: string) => {
                await highlighter.loadLanguage(lang as never);
              },
              getLoadedLanguages: () => highlighter.getLoadedLanguages().map(String),
              codeToHtml: async (code: string, options: Parameters<CodeToHtmlFn>[1]) =>
                highlighter.codeToHtml(code, {
                  lang: options.lang,
                  themes: options.themes,
                }),
            };
          },
        );
      }

      return highlighterPromise;
    }

    return async (code: string, options: Parameters<CodeToHtmlFn>[1]) => {
      const highlighter = await getHighlighter();
      const lang = options.lang?.toLowerCase() ?? SHIKI_FALLBACK_LANGUAGE;

      try {
        await highlighter.loadLanguage(lang);
      } catch {
        // Fall back to text if the language isn't available.
      }

      return highlighter.codeToHtml(code, {
        lang: highlighter.getLoadedLanguages().includes(lang) ? lang : SHIKI_FALLBACK_LANGUAGE,
        themes: options.themes,
      });
    };
  }, []);

  const navigateToFragment = useCallback(
    (id: string, { replace = false }: { replace?: boolean } = {}) => {
      const el = document.getElementById(id);
      if (el) {
        const url = `${window.location.pathname}${window.location.search}#${encodeURIComponent(id)}`;
        if (replace) {
          history.replaceState(null, "", url);
        } else {
          history.pushState(null, "", url);
        }

        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [],
  );

  const drawerActions = useMemo<MobileDrawerAction[]>(
    () => [
      {
        label: "Exit reader mode",
        icon: <X size={18} weight="bold" />,
        onClick: onExit,
      },
      {
        label: "Open in web app",
        icon: <ArrowSquareOut size={18} weight="bold" />,
        onClick: () => {
          window.open(
            `${WEB_APP_URL}?url=${encodeURIComponent(sourceUrl)}`,
            "_blank",
            "noopener,noreferrer",
          );
        },
      },
    ],
    [onExit, sourceUrl],
  );

  return (
    <ReaderProvider navigateToFragment={navigateToFragment} codeToHtml={codeToHtml}>
      <ExtensionHotkeys sourceUrl={sourceUrl} onExit={onExit} />
      <div className="min-h-dvh bg-background font-sans text-foreground">
        <ReaderView
          article={article}
          sourceUrl={sourceUrl}
          actionButton={
            <button
              type="button"
              onClick={onExit}
              aria-label="Exit reader mode"
              className="flex size-10 cursor-pointer items-center justify-center text-muted transition-[color,scale] duration-150 ease-out hover:text-foreground active:scale-[0.96] md:pointer-events-auto"
            >
              <X size={18} weight="bold" />
            </button>
          }
          drawerActions={drawerActions}
        />
      </div>
    </ReaderProvider>
  );
}

/** Hotkeys that are inside ReaderProvider so they can read overlayOpen from context. */
function ExtensionHotkeys({ sourceUrl, onExit }: { sourceUrl: string; onExit: () => void }) {
  const { overlayOpen } = useReaderContext();

  useHotkey(
    "Escape",
    () => {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        return;
      }
      onExit();
    },
    { enabled: !overlayOpen },
  );

  useHotkey(
    "O",
    () => {
      window.open(
        `${WEB_APP_URL}?url=${encodeURIComponent(sourceUrl)}`,
        "_blank",
        "noopener,noreferrer",
      );
    },
    { enabled: !overlayOpen },
  );

  return null;
}
