import { useEffect, useState } from "react";
import type { Article } from "../reader";
import { useReaderContext } from "../reader-context";

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  article: Article;
}

export function TableOfContents({ article }: TableOfContentsProps) {
  const { scrollContainer, contentRoot, navigateToFragment } = useReaderContext();
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  // Extract headings from the rendered DOM (after ArticleView processes IDs)
  useEffect(() => {
    let frame = 0;

    function updateHeadings() {
      const elements = contentRoot.querySelectorAll<HTMLElement>(".prose h2, .prose h3, .prose h4");
      const found: Heading[] = [];
      for (const el of elements) {
        if (el.id && el.textContent?.trim()) {
          found.push({
            id: el.id,
            text: el.textContent.trim(),
            level: Number.parseInt(el.tagName[1], 10),
          });
        }
      }
      setHeadings(found);
      setActiveId((current) =>
        found.some((heading) => heading.id === current) ? current : (found[0]?.id ?? ""),
      );
    }

    function scheduleUpdate() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateHeadings);
    }

    const observerTarget = contentRoot instanceof Document ? contentRoot.body : contentRoot;
    const observer = observerTarget
      ? new MutationObserver(() => {
          scheduleUpdate();
        })
      : null;

    scheduleUpdate();
    observer?.observe(observerTarget, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [article.content, contentRoot]);

  // Scroll-based active heading tracking is more reliable than IntersectionObserver
  // here because the same component runs against both the window and custom
  // scroll containers, including inside extension iframes.
  useEffect(() => {
    if (headings.length === 0) {
      setActiveId("");
      return;
    }

    const elements: HTMLElement[] = [];

    for (const h of headings) {
      const el =
        contentRoot instanceof Document
          ? contentRoot.getElementById(h.id)
          : contentRoot.querySelector<HTMLElement>(`#${CSS.escape(h.id)}`);
      if (el) {
        elements.push(el);
      }
    }

    if (elements.length === 0) {
      return;
    }

    const target = scrollContainer ?? window;
    const TOP_OFFSET = 96;
    const BOTTOM_THRESHOLD = 24;
    let frame = 0;

    function getRelativeTop(el: HTMLElement) {
      const top = el.getBoundingClientRect().top;
      if (!scrollContainer) {
        return top;
      }

      return top - scrollContainer.getBoundingClientRect().top;
    }

    function updateActiveId() {
      let nextId = elements[0].id;

      for (const el of elements) {
        if (getRelativeTop(el) <= TOP_OFFSET) {
          nextId = el.id;
          continue;
        }

        break;
      }

      const atBottom = scrollContainer
        ? scrollContainer.scrollTop + scrollContainer.clientHeight >=
          scrollContainer.scrollHeight - BOTTOM_THRESHOLD
        : window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - BOTTOM_THRESHOLD;

      if (atBottom) {
        nextId = elements[elements.length - 1].id;
      }

      setActiveId((current) => (current === nextId ? current : nextId));
    }

    function scheduleUpdate() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateActiveId);
    }

    scheduleUpdate();
    target.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      cancelAnimationFrame(frame);
      target.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [headings, scrollContainer, contentRoot]);

  if (headings.length === 0) {
    return null;
  }

  const minLevel = Math.min(...headings.map((h) => h.level));

  return (
    <nav
      aria-label="Table of contents"
      className="js-toc fixed left-6 top-20 hidden max-h-[calc(100vh-8rem)] w-56 max-w-[calc(50vw-21rem)] overflow-y-auto overscroll-contain xl:block"
    >
      <TocList
        headings={headings}
        activeId={activeId}
        baseLevel={minLevel}
        onActivate={setActiveId}
        navigateToFragment={navigateToFragment}
      />
    </nav>
  );
}

function TocList({
  headings,
  activeId,
  baseLevel,
  onActivate,
  navigateToFragment,
}: {
  headings: Heading[];
  activeId: string;
  baseLevel: number;
  onActivate: (id: string) => void;
  navigateToFragment: (id: string, opts?: { replace?: boolean }) => void;
}) {
  const items: { heading: Heading; children: Heading[] }[] = [];

  for (const heading of headings) {
    if (heading.level === baseLevel) {
      items.push({ heading, children: [] });
    } else if (items.length > 0) {
      items[items.length - 1].children.push(heading);
    }
  }

  return (
    <ol className="toc-list">
      {items.map(({ heading, children }) => (
        <li key={heading.id}>
          <TocLink
            heading={heading}
            isActive={activeId === heading.id}
            onActivate={onActivate}
            onClick={navigateToFragment}
          />
          {children.length > 0 && (
            <ol className="toc-list">
              {children.map((child) => (
                <li key={child.id}>
                  <TocLink
                    heading={child}
                    isActive={activeId === child.id}
                    onActivate={onActivate}
                    onClick={navigateToFragment}
                  />
                </li>
              ))}
            </ol>
          )}
        </li>
      ))}
    </ol>
  );
}

function TocLink({
  heading,
  isActive,
  onActivate,
  onClick,
}: {
  heading: Heading;
  isActive: boolean;
  onActivate: (id: string) => void;
  onClick: (id: string, opts?: { replace?: boolean }) => void;
}) {
  return (
    <a
      href={`#${heading.id}`}
      className={`toc-link${isActive ? " is-active-link" : ""}`}
      onClick={(e) => {
        e.preventDefault();
        onActivate(heading.id);
        onClick(heading.id, { replace: true });
      }}
    >
      {heading.text}
    </a>
  );
}
