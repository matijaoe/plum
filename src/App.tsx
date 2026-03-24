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
    <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-neutral-200 bg-[#FDFBF7] px-4 py-2 dark:border-white/[0.08] dark:bg-[#141210]">
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
            "min-w-0 flex-1 bg-transparent font-mono text-sm outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-600",
            article && "text-neutral-400 dark:text-neutral-600",
          )}
        />
        {article ? (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 cursor-pointer pl-3 font-mono text-xs text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
          >
            clear
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading || !resolvedUrl}
            className={clsx(
              "shrink-0 cursor-pointer pl-3 font-mono text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              resolvedUrl
                ? "text-neutral-900 dark:text-neutral-100"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100",
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
    <div className="min-h-screen font-sans text-neutral-900 dark:text-neutral-100">
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
      <main className="mx-auto max-w-prose px-4 py-12">
        {error && <p className="text-sm text-neutral-400">Could not extract article content.</p>}
        {article && <ArticleView article={article} sourceUrl={normalizeUrl(url)} />}
      </main>
    </div>
  );
}

export default App;
