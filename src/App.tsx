import { Agentation } from "agentation";
import clsx from "clsx";
import { Plus } from "@phosphor-icons/react";
import { useCallback } from "react";
import { ArticleView } from "./components/article-view";
import { TableOfContents } from "./components/table-of-contents";
import { DragOverlay } from "./components/drag-overlay";
import { DropZone } from "./components/drop-zone";
import { MobileDrawer } from "./components/mobile-drawer";
import { ThemeToggle } from "./components/theme-toggle";
import { TtsControls } from "./components/tts-controls";
import { useArticle } from "./hooks/use-article";
import { useDoubleEscape } from "./hooks/use-double-escape";
import { useGlobalDrop } from "./hooks/use-global-drop";
import { useGlobalPaste } from "./hooks/use-global-paste";
import { useIsMobile } from "./hooks/use-is-mobile";

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

  const hasArticle = !!article && !!sourceUrl;

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Top controls — hidden on mobile when article is loaded */}
      {!(isMobile && hasArticle) && (
        <div
          className={clsx(
            "flex items-center justify-between p-3",
            "md:pointer-events-none md:fixed md:inset-x-0 md:top-0 md:z-20",
            isDragging && "opacity-0 transition-opacity duration-200",
          )}
        >
          {sourceUrl ? (
            <button
              type="button"
              onClick={clear}
              aria-label="New article"
              className="cursor-pointer p-2 text-muted transition-colors hover:text-foreground md:pointer-events-auto"
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
          <TableOfContents article={article} />
          <main
            className={clsx(
              "mx-auto max-w-prose px-4 pt-4 pb-40 md:pt-12",
              isDragging && "opacity-50 transition-opacity duration-300",
            )}
          >
            <ArticleView article={article} sourceUrl={sourceUrl} />
          </main>

          {/* Desktop: floating player */}
          {!isMobile && (
            <div className="fixed bottom-5 left-5 z-20">
              <TtsControls articleHtml={article.content} />
            </div>
          )}

          {/* Mobile: bottom drawer with player + actions */}
          {isMobile && <MobileDrawer articleHtml={article.content} onClear={clear} />}
        </>
      ) : !sourceUrl ? (
        <DropZone isDragging={isDragging} onUrl={submitUrl} />
      ) : null}

      {import.meta.env.DEV && <Agentation />}
    </div>
  );
}

export default App;
