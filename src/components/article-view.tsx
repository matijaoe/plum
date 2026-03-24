import { useEffect, useMemo, useRef } from "react";
import type { Article } from "../reader";
import { formatDate } from "../utils";

function parseSourceParts(url: string): { host: string; path: string } {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = parsed.pathname.replace(/\/$/, "") + parsed.search + parsed.hash;
    return { host, path };
  } catch {
    return { host: url, path: "" };
  }
}

interface ArticleViewProps {
  article: Article;
  sourceUrl: string;
}

export function ArticleView({ article, sourceUrl }: ArticleViewProps) {
  const proseRef = useRef<HTMLDivElement>(null);
  const source = useMemo(() => parseSourceParts(sourceUrl), [sourceUrl]);

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
    void import("../highlight").then(({ highlightCodeBlocks }) =>
      highlightCodeBlocks(el, controller.signal),
    );
    return () => controller.abort();
  }, [article]);

  return (
    <article dir={article.dir ?? undefined} lang={article.lang ?? undefined}>
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="source-link group mb-3 inline-flex text-xs font-semibold uppercase tracking-widest text-muted"
      >
        <span>{source.host}</span>
        {source.path && (
          <span className="inline-block max-w-0 truncate opacity-0 transition-all duration-300 ease-out group-hover:max-w-[20rem] group-hover:opacity-60">
            {source.path}
          </span>
        )}
        <span className="ml-1.5 opacity-70">↗</span>
      </a>

      <h1 className="font-serif text-3xl font-normal leading-[1.15] text-balance text-foreground sm:text-4xl lg:text-[2.75rem]">
        {article.title}
      </h1>

      <p className="mt-4 text-sm text-muted">
        {[
          article.publishedDate && formatDate(article.publishedDate),
          article.byline,
          `${article.readTime} min read`,
        ]
          .filter(Boolean)
          .join(" \u00B7 ")}
      </p>

      {article.ogImage && (
        <img
          src={article.ogImage}
          alt=""
          className="mt-8 w-full rounded-lg border border-border-subtle"
        />
      )}

      <div
        ref={proseRef}
        className="prose prose-lg mt-8 max-w-none font-serif text-pretty"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />
    </article>
  );
}
