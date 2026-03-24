import clsx from "clsx";
import { ArticleView } from "./components/article-view";
import { TtsControls } from "./components/tts-controls";
import { useArticle } from "./hooks/use-article";
import type { Article } from "./reader";
import { normalizeUrl } from "./reader";

interface HeaderBarProps {
  article: Article | null;
  url: string;
  setUrl: (url: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  loading: boolean;
  resolvedUrl: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onClear: () => void;
}

function HeaderBar({
  article,
  url,
  setUrl,
  inputRef,
  loading,
  resolvedUrl,
  onSubmit,
  onClear,
}: HeaderBarProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-border-subtle bg-background px-4 py-2">
      {article ? (
        <div className="w-0 flex-1">
          <TtsControls articleHtml={article.content} />
        </div>
      ) : (
        <div className="w-0 flex-1" />
      )}
      <form onSubmit={onSubmit} className="flex w-full max-w-prose items-center gap-2 px-4">
        <input
          ref={inputRef}
          autoFocus
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          readOnly={article !== null}
          placeholder="Paste a link..."
          className={clsx(
            "min-w-0 flex-1 bg-transparent font-mono text-sm outline-none placeholder:text-muted",
            article && "text-muted",
          )}
        />
        {article ? (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 cursor-pointer pl-3 font-mono text-xs text-muted transition-colors hover:text-secondary"
          >
            clear
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading || !resolvedUrl}
            className={clsx(
              "shrink-0 cursor-pointer pl-3 font-mono text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              resolvedUrl ? "text-foreground" : "text-muted hover:text-foreground",
            )}
          >
            read
          </button>
        )}
      </form>
      <div className="w-0 flex-1" />
    </header>
  );
}

function App() {
  const { url, setUrl, article, loading, error, resolvedUrl, inputRef, handleSubmit, handleClear } =
    useArticle();

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <HeaderBar
        article={article}
        url={url}
        setUrl={setUrl}
        inputRef={inputRef}
        loading={loading}
        resolvedUrl={resolvedUrl}
        onSubmit={handleSubmit}
        onClear={handleClear}
      />
      <main className="mx-auto max-w-prose px-4 pt-12 pb-24">
        {error && <p className="text-sm text-muted">Could not extract article content.</p>}
        {article && <ArticleView article={article} sourceUrl={normalizeUrl(url)} />}
      </main>
    </div>
  );
}

export default App;
