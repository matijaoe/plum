import { useRef, useState } from "react";
import { Readability } from "@mozilla/readability";
import DOMPurify from "dompurify";

interface Article {
  title: string;
  content: string;
  byline: string | null;
  siteName: string;
  ogImage: string | null;
  publishedDate: string | null;
  readTime: number;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function calculateReadTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, "");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 238));
}

async function fetchHtml(url: string): Promise<string> {
  const encoded = encodeURIComponent(url);
  const proxies = [
    {
      url: `https://api.codetabs.com/v1/proxy/?quest=${encoded}`,
      parse: (res: Response) => res.text(),
    },
    {
      url: `https://api.allorigins.win/get?url=${encoded}`,
      parse: async (res: Response) => {
        const json = await res.json();
        return json.contents as string;
      },
    },
  ];

  for (const proxy of proxies) {
    try {
      const res = await fetch(proxy.url);
      if (!res.ok) {
        continue;
      }
      return await proxy.parse(res);
    } catch {
      continue;
    }
  }
  throw new Error("All proxies failed");
}

async function fetchArticle(rawUrl: string): Promise<Article> {
  const normalizedUrl =
    rawUrl.startsWith("http://") || rawUrl.startsWith("https://") ? rawUrl : `https://${rawUrl}`;

  const html = await fetchHtml(normalizedUrl);

  const doc = new DOMParser().parseFromString(html, "text/html");
  const base = doc.createElement("base");
  base.href = normalizedUrl;
  doc.head.prepend(base);

  const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? null;
  const ogSiteName =
    doc.querySelector('meta[property="og:site_name"]')?.getAttribute("content") ?? null;
  const publishedDate =
    doc.querySelector('meta[property="article:published_time"]')?.getAttribute("content") ??
    doc.querySelector("time[datetime]")?.getAttribute("datetime") ??
    doc.querySelector('meta[name="date"]')?.getAttribute("content") ??
    null;

  const parsed = new Readability(doc).parse();
  if (!parsed) {
    throw new Error("Failed to parse article");
  }

  const rawContent = parsed.content ?? "";
  const content = DOMPurify.sanitize(rawContent);

  let siteName = parsed.siteName ?? ogSiteName;
  if (!siteName) {
    try {
      siteName = new URL(normalizedUrl).hostname;
    } catch {
      siteName = normalizedUrl;
    }
  }

  return {
    title: parsed.title ?? "",
    content,
    byline: parsed.byline ?? null,
    siteName,
    ogImage,
    publishedDate,
    readTime: calculateReadTime(rawContent),
  };
}

function App() {
  const [url, setUrl] = useState("");
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || loading) {
      return;
    }
    setLoading(true);
    setError(false);
    setArticle(null);
    try {
      const result = await fetchArticle(url.trim());
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
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-[#FDFBF7] dark:border-neutral-800 dark:bg-[#141210]">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-prose items-center gap-2 px-4 py-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            readOnly={article !== null}
            placeholder="Paste a link..."
            className="min-w-0 flex-1 bg-transparent font-mono text-sm outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
          />
          {article ? (
            <button
              type="button"
              onClick={handleClear}
              className="shrink-0 cursor-pointer text-sm text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              Clear
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="shrink-0 cursor-pointer text-sm text-neutral-500 transition-colors hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:text-neutral-100"
            >
              Read
            </button>
          )}
        </form>
      </header>

      <main className="mx-auto max-w-prose px-4 py-12">
        {error && <p className="text-sm text-neutral-400">Could not extract article content.</p>}

        {article && (
          <article>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
              {article.siteName}
            </p>

            <h1 className="font-serif text-3xl font-light leading-tight text-neutral-900 sm:text-4xl lg:text-5xl dark:text-neutral-100">
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
              className="prose prose-lg dark:prose-invert mt-8 max-w-none font-serif"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </article>
        )}
      </main>
    </div>
  );
}

export default App;
