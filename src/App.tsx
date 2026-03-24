import clsx from "clsx";
import { useMemo, useRef, useState } from "react";
import type { Article } from "./reader";
import { fetchArticle, normalizeUrl } from "./reader";
import { formatDate } from "./utils";

function App() {
  const [url, setUrl] = useState("");
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const resolvedUrl = useMemo(() => {
    const trimmed = url.trim();
    if (!trimmed) {
      return null;
    }
    try {
      new URL(normalizeUrl(trimmed));
      return trimmed;
    } catch {
      return null;
    }
  }, [url]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resolvedUrl || loading) {
      return;
    }
    setLoading(true);
    setError(false);
    setArticle(null);
    try {
      const result = await fetchArticle(resolvedUrl);
      setArticle(result);
    } catch (err) {
      console.error("Article extraction failed:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setArticle(null);
    setError(false);
    setUrl("");
    inputRef.current?.focus();
  }

  return (
    <div className="min-h-screen font-sans text-neutral-900 dark:text-neutral-100">
      <header className="sticky top-0 z-10 relative border-b border-neutral-200 bg-[#FDFBF7] py-2 dark:border-neutral-800 dark:bg-[#141210]">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-prose items-center gap-2 px-4">
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
              onClick={handleClear}
              className="shrink-0 cursor-pointer pl-3 text-sm lowercase text-neutral-500 transition-colors hover:text-neutral-900 hover:underline dark:hover:text-neutral-100"
            >
              Clear
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading || !resolvedUrl}
              className={clsx(
                "shrink-0 cursor-pointer pl-3 text-sm lowercase transition-colors hover:underline disabled:cursor-not-allowed disabled:opacity-40",
                resolvedUrl
                  ? "text-neutral-900 dark:text-neutral-100"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100",
              )}
            >
              Read
            </button>
          )}
        </form>
        {article && (
          <a
            href={normalizeUrl(url)}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-sm lowercase text-neutral-400 transition-colors hover:text-neutral-900 hover:underline dark:hover:text-neutral-100"
          >
            source ↗
          </a>
        )}
      </header>

      <main className="mx-auto max-w-prose px-4 py-12">
        {error && <p className="text-sm text-neutral-400">Could not extract article content.</p>}

        {article && (
          <article>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
              {article.siteName}
            </p>

            <h1 className="font-serif text-3xl font-normal leading-[1.15] text-balance text-neutral-900 sm:text-4xl lg:text-[2.75rem] dark:text-neutral-100">
              {article.title}
            </h1>

            <p className="mt-4 text-sm text-neutral-400 dark:text-neutral-500">
              {[
                article.byline,
                article.publishedDate && formatDate(article.publishedDate),
                `${article.readTime} min read`,
              ]
                .filter(Boolean)
                .join(" \u00B7 ")}
            </p>

            {article.ogImage && (
              <img src={article.ogImage} alt="" className="mt-8 w-full rounded-lg" />
            )}

            <div
              className="prose prose-lg dark:prose-invert mt-8 max-w-none font-serif text-pretty"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </article>
        )}
      </main>
    </div>
  );
}

export default App;
