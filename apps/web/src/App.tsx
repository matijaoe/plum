import { Agentation } from "agentation";
import clsx from "clsx";
import { Plus } from "@phosphor-icons/react";
import { useCallback, useMemo } from "react";
import {
  ArticleView,
  MobileDrawer,
  TableOfContents,
  ScrollToTop,
  ThemeToggle,
  TtsControls,
  useDoubleEscape,
  useIsMobile,
} from "@plum/core";
import type { MobileDrawerAction } from "@plum/core";
import { DragOverlay } from "./components/drag-overlay";
import { DropZone } from "./components/drop-zone";
import { useArticle } from "./hooks/use-article";
import { useGlobalDrop } from "./hooks/use-global-drop";
import { useGlobalPaste } from "./hooks/use-global-paste";

function App() {
  const { article, sourceUrl, submitUrl, clear } = useArticle();
  useGlobalPaste(submitUrl);
  const { isDragging } = useGlobalDrop(submitUrl);
  const isMobile = useIsMobile();
  useDoubleEscape(
    useCallback(() => {
      if (article) {
        clear();
      }
    }, [article, clear]),
  );

  const drawerActions = useMemo<MobileDrawerAction[]>(
    () => [
      {
        label: "Read new article",
        icon: <Plus size={18} weight="bold" />,
        onClick: clear,
      },
    ],
    [clear],
  );

  const hasArticle = !!article && !!sourceUrl;

  return (
    <div className="min-h-dvh bg-background font-sans text-foreground">
      {/* Top controls — hidden on mobile when article is loaded */}
      {!(isMobile && hasArticle) && (
        <div
          className={clsx(
            "flex items-center justify-between p-3",
            "md:pointer-events-none md:fixed md:inset-x-0 md:top-0 md:z-20",
            "transition-opacity duration-200",
            isDragging && "opacity-0",
          )}
        >
          {sourceUrl ? (
            <button
              type="button"
              onClick={clear}
              aria-label="New article"
              className="flex size-10 cursor-pointer items-center justify-center text-muted transition-[color,scale] duration-150 ease-out hover:text-foreground active:scale-[0.96] md:pointer-events-auto"
            >
              <Plus size={18} weight="bold" />
            </button>
          ) : (
            <div />
          )}
          <div className="md:pointer-events-auto">
            <ThemeToggle />
          </div>
        </div>
      )}

      {hasArticle ? (
        <>
          {isDragging && <DragOverlay />}
          <ScrollToTop />
          <TableOfContents article={article} />
          <main
            className={clsx(
              "mx-auto max-w-prose px-4 pt-4 pb-40 md:pt-12",
              isDragging && "opacity-50 transition-opacity duration-300",
            )}
          >
            <ArticleView key={sourceUrl} article={article} sourceUrl={sourceUrl} />
          </main>

          {/* Desktop: floating player */}
          {!isMobile && (
            <div className="fixed bottom-5 left-5 z-20">
              <TtsControls articleHtml={article.content} />
            </div>
          )}

          {/* Mobile: bottom drawer with player + actions */}
          {isMobile && <MobileDrawer articleHtml={article.content} actions={drawerActions} />}
        </>
      ) : !sourceUrl ? (
        <DropZone isDragging={isDragging} onUrl={submitUrl} />
      ) : null}

      {import.meta.env.DEV && <Agentation />}
    </div>
  );
}

export default App;
