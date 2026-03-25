import { ArrowLeft, ArrowRight, DownloadSimple, X } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef } from "react";
import Lightbox from "yet-another-react-lightbox";
import Download from "yet-another-react-lightbox/plugins/download";
import "yet-another-react-lightbox/styles.css";
import { useArticleLightbox } from "../hooks/use-article-lightbox";
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
  const { slides, open, index, setIndex, setOpen, openLightbox, handleProseClick } =
    useArticleLightbox(article);

  useEffect(() => {
    const el = proseRef.current;
    if (!el) {
      return;
    }

    // Resolve source origin+pathname for matching full-URL heading anchors
    let sourceOriginPath = "";
    try {
      const parsed = new URL(sourceUrl);
      sourceOriginPath = parsed.origin + parsed.pathname.replace(/\/$/, "");
    } catch {
      // ignore
    }

    // Rewrite heading anchor links to local fragments
    const headingAnchors = new Set<Element>();
    for (const heading of el.querySelectorAll("h1, h2, h3, h4, h5, h6")) {
      const anchor = heading.querySelector(":scope > a[href]");
      if (!anchor) {
        continue;
      }

      const href = anchor.getAttribute("href") ?? "";
      let fragment = "";

      if (href.startsWith("#")) {
        fragment = href.slice(1);
      } else if (href.includes("#") && sourceOriginPath) {
        try {
          const linkUrl = new URL(href);
          const linkOriginPath = linkUrl.origin + linkUrl.pathname.replace(/\/$/, "");
          if (linkOriginPath === sourceOriginPath && linkUrl.hash) {
            fragment = linkUrl.hash.slice(1);
          }
        } catch {
          // not a valid URL, skip
        }
      }

      if (!fragment) {
        continue;
      }

      if (!heading.id) {
        heading.id = decodeURIComponent(fragment);
      }

      anchor.setAttribute("href", `#${heading.id}`);
      anchor.removeAttribute("target");
      anchor.removeAttribute("rel");
      headingAnchors.add(anchor);
    }

    for (const link of el.querySelectorAll("a[href]")) {
      if (headingAnchors.has(link)) {
        continue;
      }

      const href = link.getAttribute("href") ?? "";

      // Rewrite any internal anchor link to a local fragment
      if (href.startsWith("#")) {
        link.removeAttribute("target");
        link.removeAttribute("rel");
        continue;
      }

      // Rewrite full URLs pointing back to the same article with a fragment
      if (sourceOriginPath && href.includes("#")) {
        try {
          const linkUrl = new URL(href);
          const linkOriginPath = linkUrl.origin + linkUrl.pathname.replace(/\/$/, "");
          if (linkOriginPath === sourceOriginPath && linkUrl.hash) {
            link.setAttribute("href", linkUrl.hash);
            link.removeAttribute("target");
            link.removeAttribute("rel");
            continue;
          }
        } catch {
          // not a valid URL, fall through to external link handling
        }
      }

      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    }

    const controller = new AbortController();
    void import("../highlight").then(({ highlightCodeBlocks }) =>
      highlightCodeBlocks(el, controller.signal),
    );
    return () => controller.abort();
  }, [article, sourceUrl]);

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
          className="mt-8 w-full cursor-zoom-in rounded-lg border border-border-subtle"
          onClick={() => openLightbox(article.ogImage!)}
        />
      )}

      <div
        ref={proseRef}
        className="prose prose-lg mt-8 max-w-none font-serif"
        dangerouslySetInnerHTML={{ __html: article.content }}
        onClick={handleProseClick}
      />

      {slides.length > 0 && (
        <Lightbox
          open={open}
          close={() => setOpen(false)}
          index={index}
          on={{ view: ({ index: i }) => setIndex(i) }}
          slides={slides}
          plugins={[Download]}
          animation={{ fade: 250, swipe: 350 }}
          carousel={{ finite: true }}
          controller={{ closeOnBackdropClick: true }}
          render={{
            iconClose: () => <X size={18} weight="bold" />,
            iconDownload: () => <DownloadSimple size={18} weight="bold" />,
            iconPrev: () => <ArrowLeft size={18} weight="bold" />,
            iconNext: () => <ArrowRight size={18} weight="bold" />,
            ...(slides.length <= 1 && {
              buttonPrev: () => null,
              buttonNext: () => null,
            }),
          }}
          className="yarl-plum"
        />
      )}
    </article>
  );
}
