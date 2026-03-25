import { Agentation } from "agentation";
import clsx from "clsx";
import { Plus } from "@phosphor-icons/react";
import { useCallback } from "react";
import { ArticleView } from "./components/article-view";
import { TableOfContents } from "./components/table-of-contents";
import { DragOverlay } from "./components/drag-overlay";
import { DropZone } from "./components/drop-zone";
import { ThemeToggle } from "./components/theme-toggle";
import { TtsControls } from "./components/tts-controls";
import { useArticle } from "./hooks/use-article";
import { useDoubleEscape } from "./hooks/use-double-escape";
import { useGlobalDrop } from "./hooks/use-global-drop";
import { useGlobalPaste } from "./hooks/use-global-paste";

function App() {
  const { article, sourceUrl, submitUrl, clear } = useArticle();
  useGlobalPaste(submitUrl);
  const { isDragging } = useGlobalDrop(submitUrl);
  useDoubleEscape(
    useCallback(() => {
      if (article) {
        clear();
      }
    }, [article, clear]),
  );

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <div
        className={clsx(
          "fixed top-3 right-3 z-20 transition-opacity duration-200",
          isDragging && "opacity-0",
        )}
      >
        <ThemeToggle />
      </div>

      {article && (
        <div
          className={clsx(
            "fixed top-3 left-3 z-20 transition-opacity duration-200",
            isDragging && "opacity-0",
          )}
        >
          <button
            type="button"
            onClick={clear}
            aria-label="New article"
            className="cursor-pointer p-2 text-muted transition-colors hover:text-foreground"
          >
            <Plus size={18} weight="bold" />
          </button>
        </div>
      )}

      {article && sourceUrl ? (
        <>
          {isDragging && <DragOverlay />}
          <TableOfContents article={article} />
          <main
            className={clsx(
              "mx-auto max-w-prose px-4 pt-12 pb-24",
              isDragging && "opacity-50 transition-opacity duration-300",
            )}
          >
            <ArticleView article={article} sourceUrl={sourceUrl} />
          </main>

          <div className="fixed bottom-4 left-4 z-20 rounded-full border border-border-subtle bg-background/80 px-5 py-2.5 backdrop-blur-md">
            <TtsControls articleHtml={article.content} />
          </div>
        </>
      ) : !sourceUrl ? (
        <DropZone isDragging={isDragging} onUrl={submitUrl} />
      ) : null}

      {import.meta.env.DEV && <Agentation />}
    </div>
  );
}

export default App;
