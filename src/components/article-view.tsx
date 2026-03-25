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

/**
 * If `href` points to a fragment on the same page as `sourceUrl`, return the
 * fragment (without the leading `#`). Handles bare fragments (`#fn1`),
 * absolute URLs, and relative URLs resolved against `sourceUrl`.
 */
function extractLocalFragment(href: string, sourceUrl: string): string | null {
  if (href.startsWith("#")) {
    return href.slice(1);
  }

  if (!href.includes("#")) {
    return null;
  }

  try {
    // Resolve relative hrefs (e.g. "./post#fn1") against the source URL
    const linkUrl = new URL(href, sourceUrl);
    const sourceParsed = new URL(sourceUrl);

    const samePage =
      linkUrl.origin === sourceParsed.origin &&
      linkUrl.pathname.replace(/\/$/, "") === sourceParsed.pathname.replace(/\/$/, "");

    if (samePage && linkUrl.hash) {
      return linkUrl.hash.slice(1);
    }
  } catch {
    // not a valid URL
  }

  return null;
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

    // Start every new article from the top instantly
    window.scrollTo({ top: 0, behavior: "instant" });

    // Rewrite heading anchor links to local fragments
    const headingAnchors = new Set<Element>();
    for (const heading of el.querySelectorAll("h1, h2, h3, h4, h5, h6")) {
      const anchor = heading.querySelector(":scope > a[href]");
      if (!anchor) {
        continue;
      }

      const fragment = extractLocalFragment(anchor.getAttribute("href") ?? "", sourceUrl);
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

    // Ensure all h2-h4 headings have IDs and anchor links for TOC navigation
    const usedIds = new Set<string>(Array.from(el.querySelectorAll("[id]"), (e) => e.id));
    for (const heading of el.querySelectorAll("h2, h3, h4")) {
      if (!heading.id) {
        let base = (heading.textContent?.trim() ?? "")
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^\w-]/g, "");
        if (!base) {
          continue;
        }
        let id = base;
        let n = 1;
        while (usedIds.has(id)) {
          id = `${base}-${n++}`;
        }
        heading.id = id;
        usedIds.add(id);
      }

      // Inject anchor link if the heading doesn't already have one
      if (!heading.querySelector(":scope > a[href^='#']")) {
        const anchor = document.createElement("a");
        anchor.href = `#${heading.id}`;
        while (heading.firstChild) {
          anchor.appendChild(heading.firstChild);
        }
        heading.appendChild(anchor);
        headingAnchors.add(anchor);
      }
    }

    for (const link of el.querySelectorAll("a[href]")) {
      if (headingAnchors.has(link)) {
        continue;
      }

      const fragment = extractLocalFragment(link.getAttribute("href") ?? "", sourceUrl);
      if (fragment != null) {
        link.setAttribute("href", `#${fragment}`);
        link.removeAttribute("target");
        link.removeAttribute("rel");
        continue;
      }

      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    }

    // Restore scroll position if the URL has a fragment (e.g. after refresh)
    if (window.location.hash) {
      const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
      if (target) {
        // Jump instantly — smooth scroll would land wrong while layout is still settling
        requestAnimationFrame(() => target.scrollIntoView({ behavior: "instant" }));
      }
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

      <h1 className="font-serif text-4xl font-normal leading-[1.12] text-balance text-foreground sm:text-[2.75rem] lg:text-5xl">
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
