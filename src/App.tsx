import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TtsControls } from "./components/tts-controls";
import type { Article } from "./reader";
import { fetchArticle, normalizeUrl } from "./reader";
import { formatDate } from "./utils";

function getInitialUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("url") ?? "";
}

function App() {
  const [url, setUrl] = useState(getInitialUrl);
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const proseRef = useRef<HTMLDivElement>(null);

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

  const loadArticle = useCallback(async (articleUrl: string) => {
    setLoading(true);
    setError(false);
    setArticle(null);
    try {
      const result = await fetchArticle(articleUrl);
      setArticle(result);
      const params = new URLSearchParams(window.location.search);
      params.set("url", articleUrl);
      window.history.replaceState(null, "", `?${params.toString()}`);
    } catch (err) {
      console.error("Article extraction failed:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resolvedUrl || loading) {
      return;
    }
    await loadArticle(resolvedUrl);
  }

  function handleClear() {
    setArticle(null);
    setError(false);
    setUrl("");
    window.history.replaceState(null, "", window.location.pathname);
    inputRef.current?.focus();
  }

  const initialFetchDone = useRef(false);
  useEffect(() => {
    if (initialFetchDone.current) {
      return;
    }
    initialFetchDone.current = true;
    const initial = getInitialUrl();
    if (initial) {
      void loadArticle(initial);
    }
  }, [loadArticle]);

  useEffect(() => {
    const el = proseRef.current;
    if (!el) {
      return;
    }
    for (const link of el.querySelectorAll("a[href]")) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    }

    const controller = new AbortController();
    import("./highlight").then(({ highlightCodeBlocks }) =>
      highlightCodeBlocks(el, controller.signal),
    );
    return () => controller.abort();
  }, [article]);

  return (
    <div className="min-h-screen font-sans text-neutral-900 dark:text-neutral-100">
      <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-neutral-200 bg-[#FDFBF7] px-4 py-2 dark:border-white/[0.08] dark:bg-[#141210]">
        {article ? (
          <div className="w-0 flex-1">
            <TtsControls articleHtml={article.content} />
          </div>
        ) : (
          <div className="w-0 flex-1" />
        )}
        <form onSubmit={handleSubmit} className="flex w-full max-w-prose items-center gap-2 px-4">
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
        {article ? (
          <div className="flex w-0 flex-1 justify-end">
            <a
              href={normalizeUrl(url)}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 font-mono text-xs text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
            >
              source ↗
            </a>
          </div>
        ) : (
          <div className="w-0 flex-1" />
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
              ref={proseRef}
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
