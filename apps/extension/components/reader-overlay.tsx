import { Plus, X } from "@phosphor-icons/react";
import { useHotkey } from "@tanstack/react-hotkeys";
import clsx from "clsx";
import { ThemeProvider, useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArticleView,
  MobileDrawer,
  PlumProvider,
  ScrollToTop,
  TableOfContents,
  ThemeToggle,
  TtsControls,
  useIsMobile,
  type Article,
  type CodeToHtmlFn,
  type MobileDrawerAction,
} from "@plum/core";

const PLUM_WEB_URL = "https://plum-reader.vercel.app";

interface ReaderOverlayProps {
  article: Article;
  sourceUrl: string;
  shadowHost: HTMLElement;
  onExit: () => void;
}

export function ReaderOverlay({ article, sourceUrl, shadowHost, onExit }: ReaderOverlayProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ReaderOverlayInner
        article={article}
        sourceUrl={sourceUrl}
        shadowHost={shadowHost}
        onExit={onExit}
      />
    </ThemeProvider>
  );
}

function ReaderOverlayInner({ article, sourceUrl, shadowHost, onExit }: ReaderOverlayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollContainer, setScrollContainer] = useState<Element | null>(null);
  const isMobile = useIsMobile();

  // Set scroll container ref after mount
  useEffect(() => {
    setScrollContainer(scrollRef.current);
  }, []);

  // Bridge next-themes resolved theme to shadow host class
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (resolvedTheme === "dark") {
      shadowHost.classList.add("dark");
      shadowHost.classList.remove("light");
    } else {
      shadowHost.classList.add("light");
      shadowHost.classList.remove("dark");
    }
  }, [resolvedTheme, shadowHost]);

  // Initialize Shiki with JS engine for CSP compatibility
  const [codeToHtml, setCodeToHtml] = useState<CodeToHtmlFn | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const { createHighlighter } = await import("shiki");
      const { createJavaScriptRegexEngine } = await import("shiki/engine/javascript");
      const highlighter = await createHighlighter({
        themes: ["vitesse-light", "vitesse-dark"],
        langs: [],
        engine: createJavaScriptRegexEngine(),
      });
      if (!cancelled) {
        setCodeToHtml(() => async (code: string, options: Parameters<CodeToHtmlFn>[1]) => {
          // Auto-load language on demand
          const lang = options.lang?.toLowerCase() ?? "text";
          try {
            await highlighter.loadLanguage(lang as never);
          } catch {
            // Fall back to text if the language isn't available
          }
          return highlighter.codeToHtml(code, {
            lang: highlighter.getLoadedLanguages().includes(lang) ? lang : "text",
            themes: options.themes,
          });
        });
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Custom fragment navigation — no pushState in extension
  const navigateToFragment = useCallback(
    (id: string) => {
      const root = shadowHost.shadowRoot;
      if (!root) {
        return;
      }
      const el = root.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    },
    [shadowHost],
  );

  // Single Escape to exit (only when TTS is not active)
  useHotkey("Escape", () => {
    if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
      onExit();
    }
  });

  // O to open in Plum web app
  useHotkey("O", () => {
    window.open(`${PLUM_WEB_URL}?url=${encodeURIComponent(sourceUrl)}`, "_blank");
  });

  const drawerActions = useMemo<MobileDrawerAction[]>(
    () => [
      {
        label: "Exit reader mode",
        icon: <X size={18} weight="bold" />,
        onClick: onExit,
      },
      {
        label: "Open in Plum",
        icon: <Plus size={18} weight="bold" />,
        onClick: () => {
          window.open(`${PLUM_WEB_URL}?url=${encodeURIComponent(sourceUrl)}`, "_blank");
        },
      },
    ],
    [onExit, sourceUrl],
  );

  const contentRoot = shadowHost.shadowRoot ?? document;

  return (
    <PlumProvider
      portalContainer={scrollRef.current}
      scrollContainer={scrollContainer}
      contentRoot={contentRoot}
      navigateToFragment={navigateToFragment}
      codeToHtml={codeToHtml}
    >
      <div
        ref={scrollRef}
        className="fixed inset-0 z-[2147483647] overflow-y-auto bg-background font-sans text-foreground"
      >
        {/* Top controls */}
        {!isMobile && (
          <div
            className={clsx(
              "flex items-center justify-between p-3",
              "md:pointer-events-none md:fixed md:inset-x-0 md:top-0 md:z-20",
            )}
          >
            <button
              type="button"
              onClick={onExit}
              aria-label="Exit reader mode"
              className="flex size-10 cursor-pointer items-center justify-center text-muted transition-[color,scale] duration-150 ease-out hover:text-foreground active:scale-[0.96] md:pointer-events-auto"
            >
              <X size={18} weight="bold" />
            </button>
            <div className="md:pointer-events-auto">
              <ThemeToggle />
            </div>
          </div>
        )}

        <ScrollToTop />
        <TableOfContents article={article} />

        <main className="mx-auto max-w-prose px-4 pt-4 pb-40 md:pt-12">
          <ArticleView key={sourceUrl} article={article} sourceUrl={sourceUrl} />
        </main>

        {/* Desktop: floating TTS player */}
        {!isMobile && (
          <div className="fixed bottom-5 left-5 z-20">
            <TtsControls articleHtml={article.content} />
          </div>
        )}

        {/* Mobile: bottom drawer */}
        {isMobile && <MobileDrawer articleHtml={article.content} actions={drawerActions} />}
      </div>
    </PlumProvider>
  );
}
