import { useHotkey } from "@tanstack/react-hotkeys";
import {
  lazy,
  startTransition,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { useArticleLightbox } from "../hooks/use-article-lightbox";
import { usePlum } from "../plum-context";
import type { Article } from "../reader";
import { downloadUrl, formatDate } from "../utils";

const ArticleLightbox = lazy(async () => {
  const module = await import("./article-lightbox");
  return { default: module.ArticleLightbox };
});

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

function processArticleContent(content: string, sourceUrl: string): string {
  const doc = new DOMParser().parseFromString(content, "text/html");

  const headingAnchors = new Set<Element>();
  for (const heading of doc.querySelectorAll("h1, h2, h3, h4, h5, h6")) {
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
    anchor.setAttribute("data-heading-link", "");
    anchor.removeAttribute("target");
    anchor.removeAttribute("rel");
    headingAnchors.add(anchor);
  }

  const usedIds = new Set<string>(Array.from(doc.querySelectorAll("[id]"), (e) => e.id));
  for (const heading of doc.querySelectorAll("h2, h3, h4")) {
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

    if (!heading.querySelector(":scope > a[href^='#']")) {
      const anchor = doc.createElement("a");
      anchor.href = `#${heading.id}`;
      anchor.setAttribute("data-heading-link", "");
      while (heading.firstChild) {
        anchor.appendChild(heading.firstChild);
      }
      heading.appendChild(anchor);
      headingAnchors.add(anchor);
    }
  }

  for (const link of doc.querySelectorAll("a[href]")) {
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

  return doc.body.innerHTML;
}

interface ArticleViewProps {
  article: Article;
  sourceUrl: string;
}

export function ArticleView({ article, sourceUrl }: ArticleViewProps) {
  const proseRef = useRef<HTMLDivElement>(null);
  const source = useMemo(() => parseSourceParts(sourceUrl), [sourceUrl]);
  const [processedContent, setProcessedContent] = useState(article.content);
  const lightbox = useArticleLightbox(article);
  const {
    portalContainer,
    scrollContainer,
    contentRoot,
    navigateToFragment,
    codeToHtml: ctxCodeToHtml,
    onOverlayChange,
  } = usePlum();
  const { slides, open, index, setIndex, openLightbox } = lightbox;

  const setOpen = useCallback(
    (value: boolean) => {
      lightbox.setOpen(value);
      onOverlayChange(value);
    },
    [lightbox, onOverlayChange],
  );

  const openLightboxWithOverlay = useCallback(
    (src: string) => {
      openLightbox(src);
      onOverlayChange(true);
    },
    [openLightbox, onOverlayChange],
  );

  function onProseClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;

    const img = target.closest("img");
    if (img?.src) {
      e.preventDefault();
      openLightboxWithOverlay(img.src);
      return;
    }

    const anchor = target.closest<HTMLAnchorElement>("a[href^='#']");
    if (anchor) {
      e.preventDefault();
      const id = decodeURIComponent(anchor.getAttribute("href")!.slice(1));
      navigateToFragment(id, { replace: anchor.hasAttribute("data-heading-link") });
    }
  }

  useHotkey("S", () => window.open(sourceUrl, "_blank", "noopener,noreferrer"), {
    enabled: !open,
  });

  useHotkey(
    "D",
    () => {
      const src = slides[index]?.src;
      if (src) {
        void downloadUrl(src);
      }
    },
    { enabled: open },
  );

  useEffect(() => {
    setProcessedContent(article.content);

    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      const nextContent = processArticleContent(article.content, sourceUrl);
      if (cancelled) {
        return;
      }

      startTransition(() => {
        setProcessedContent((current) => (current === nextContent ? current : nextContent));
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [article.content, sourceUrl]);

  useEffect(() => {
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "instant" });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [sourceUrl, scrollContainer]);

  useEffect(() => {
    if (window.location.hash) {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const target =
        contentRoot instanceof Document
          ? contentRoot.getElementById(id)
          : contentRoot.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
      if (target) {
        requestAnimationFrame(() => target.scrollIntoView({ behavior: "instant" }));
      }
    }
  }, [processedContent, contentRoot]);

  useEffect(() => {
    const el = proseRef.current;
    if (!el) {
      return;
    }

    const controller = new AbortController();
    const roots: Root[] = [];
    const codeBlocks = el.querySelectorAll("pre > code");
    let idleHandle: number | null = null;
    let timeoutHandle: number | null = null;

    if (codeBlocks.length === 0) {
      return () => {
        controller.abort();
      };
    }

    const runHighlight = async () => {
      const { highlightCodeBlocks } = await import("../highlight");
      await highlightCodeBlocks(el, controller.signal, ctxCodeToHtml ?? undefined);
      if (controller.signal.aborted) {
        return;
      }

      const pres = el.querySelectorAll<HTMLPreElement>("pre");
      if (pres.length === 0) {
        return;
      }

      const { CodeCopyButton } = await import("./code-copy-button");
      for (const pre of pres) {
        if (pre.querySelector(".code-copy-btn")) {
          continue;
        }
        const container = document.createElement("span");
        pre.appendChild(container);
        const root = createRoot(container);
        roots.push(root);
        root.render(<CodeCopyButton pre={pre} />);
      }
    };

    if ("requestIdleCallback" in window) {
      idleHandle = window.requestIdleCallback(() => {
        void runHighlight();
      });
    } else {
      timeoutHandle = globalThis.setTimeout(() => {
        void runHighlight();
      }, 0);
    }

    return () => {
      controller.abort();
      if (idleHandle !== null) {
        if ("cancelIdleCallback" in window) {
          window.cancelIdleCallback(idleHandle);
        }
      }
      if (timeoutHandle !== null) {
        globalThis.clearTimeout(timeoutHandle);
      }
      for (const root of roots) {
        root.unmount();
      }
    };
  }, [processedContent, ctxCodeToHtml]);

  return (
    <article dir={article.dir ?? undefined} lang={article.lang ?? undefined}>
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="stagger-in source-link group mb-0.5 inline-flex py-2.5 text-xs font-semibold uppercase tracking-wider text-muted"
      >
        <span>{source.host}</span>
        {source.path && (
          <span className="inline-block max-w-0 truncate opacity-0 transition-[max-width,opacity] duration-300 ease-out group-hover:max-w-[20rem] group-hover:opacity-50">
            {source.path}
          </span>
        )}
        <span className="ml-1.5">↗</span>
      </a>

      <h1
        className="stagger-in font-serif text-4xl font-normal leading-[1.12] text-balance text-foreground sm:text-[2.75rem] lg:text-5xl"
        style={{ animationDelay: "120ms" }}
      >
        {article.title}
      </h1>

      <p className="stagger-in mt-4 text-sm text-muted" style={{ animationDelay: "240ms" }}>
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
          className="stagger-in mt-8 w-full cursor-zoom-in rounded-lg outline outline-1 -outline-offset-1 outline-border-subtle"
          style={{ animationDelay: "360ms" }}
          onClick={() => openLightboxWithOverlay(article.ogImage!)}
        />
      )}

      <div
        ref={proseRef}
        className="stagger-in prose prose-lg mt-8 max-w-none font-serif"
        style={{ animationDelay: article.ogImage ? "480ms" : "360ms" }}
        dangerouslySetInnerHTML={{ __html: processedContent }}
        onClick={onProseClick}
      />

      {open && slides.length > 0 && (
        <Suspense fallback={null}>
          <ArticleLightbox
            open={open}
            index={index}
            setIndex={setIndex}
            setOpen={setOpen}
            slides={slides}
            portalContainer={portalContainer}
          />
        </Suspense>
      )}
    </article>
  );
}
