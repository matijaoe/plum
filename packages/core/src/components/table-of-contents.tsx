import tocbot from "tocbot";
import { useEffect, useRef } from "react";
import type { Article } from "../reader";
import { navigateToFragment } from "../hooks/use-fragment-navigation";

interface TableOfContentsProps {
  article: Article;
}

/**
 * When the user scrolls near the bottom of the page, the last heading can
 * never reach the top of the viewport, so tocbot won't activate it.
 * This hook detects that case and forces the last TOC link active.
 */
function useActivateLastSectionAtBottom(tocRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const toc = tocRef.current;
    if (!toc) {
      return;
    }

    const BOTTOM_THRESHOLD = 30;

    function handleScroll() {
      if (!toc) {
        return;
      }

      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - BOTTOM_THRESHOLD;

      if (!atBottom) {
        return;
      }

      const links = toc.querySelectorAll<HTMLAnchorElement>(".toc-link");
      if (links.length === 0) {
        return;
      }

      const lastLink = links[links.length - 1];
      if (lastLink.classList.contains("is-active-link")) {
        return;
      }

      for (const link of links) {
        link.classList.remove("is-active-link");
        link.closest("li")?.classList.remove("is-active-li");
      }

      lastLink.classList.add("is-active-link");
      lastLink.closest("li")?.classList.add("is-active-li");
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [tocRef]);
}

export function TableOfContents({ article }: TableOfContentsProps) {
  const tocRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      tocbot.init({
        tocSelector: ".js-toc",
        contentSelector: ".prose",
        headingSelector: "h2, h3, h4",
        orderedList: false,
        headingsOffset: 32,
        scrollSmooth: false,
        hasInnerContainers: true,
        scrollHandlerType: "throttle",
        throttleTimeout: 0,
        onClick(e) {
          e.preventDefault();
          const href = (e.currentTarget as HTMLAnchorElement).getAttribute("href");
          if (!href?.startsWith("#")) {
            return;
          }
          navigateToFragment(decodeURIComponent(href.slice(1)), { replace: true });
        },
      });
    });

    return () => {
      cancelAnimationFrame(frame);
      tocbot.destroy();
    };
  }, [article]);

  useActivateLastSectionAtBottom(tocRef);

  return (
    <nav
      ref={tocRef}
      aria-label="Table of contents"
      className="js-toc fixed left-6 top-20 hidden max-h-[calc(100vh-8rem)] w-56 max-w-[calc(50vw-21rem)] overflow-y-auto overscroll-contain xl:block"
    />
  );
}
