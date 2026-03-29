import { useEffect, useRef, useState } from "react";
import type { Article } from "../reader";
import { usePlum } from "../plum-context";

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  article: Article;
}

export function TableOfContents({ article }: TableOfContentsProps) {
  const tocRef = useRef<HTMLElement>(null);
  const { scrollContainer, contentRoot, navigateToFragment } = usePlum();
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  // Extract headings from the rendered DOM (after ArticleView processes IDs)
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
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
    });
    return () => cancelAnimationFrame(frame);
  }, [article.content, contentRoot]);

  // IntersectionObserver-based scroll spy
  useEffect(() => {
    if (headings.length === 0) {
      return;
    }

    const root = scrollContainer ?? null;
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

    const visibleIds = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleIds.add(entry.target.id);
          } else {
            visibleIds.delete(entry.target.id);
          }
        }

        // Pick the first visible heading in document order
        for (const el of elements) {
          if (visibleIds.has(el.id)) {
            setActiveId(el.id);
            return;
          }
        }
      },
      { root, rootMargin: "-32px 0px -70% 0px", threshold: 0 },
    );

    for (const el of elements) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings, scrollContainer, contentRoot]);

  // Activate last section when scrolled to bottom
  useEffect(() => {
    if (headings.length === 0) {
      return;
    }

    const target = scrollContainer ?? window;
    let timer: ReturnType<typeof setTimeout>;
    const BOTTOM_THRESHOLD = 30;

    function handleScrollEnd() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        let atBottom: boolean;
        if (scrollContainer) {
          atBottom =
            scrollContainer.scrollTop + scrollContainer.clientHeight >=
            scrollContainer.scrollHeight - BOTTOM_THRESHOLD;
        } else {
          atBottom =
            window.innerHeight + window.scrollY >=
            document.documentElement.scrollHeight - BOTTOM_THRESHOLD;
        }

        if (atBottom) {
          setActiveId(headings[headings.length - 1].id);
        }
      }, 100);
    }

    target.addEventListener("scrollend", handleScrollEnd);
    return () => {
      clearTimeout(timer);
      target.removeEventListener("scrollend", handleScrollEnd);
    };
  }, [headings, scrollContainer]);

  if (headings.length === 0) {
    return null;
  }

  const minLevel = Math.min(...headings.map((h) => h.level));

  return (
    <nav
      ref={tocRef}
      aria-label="Table of contents"
      className="js-toc fixed left-6 top-20 hidden max-h-[calc(100vh-8rem)] w-56 max-w-[calc(50vw-21rem)] overflow-y-auto overscroll-contain xl:block"
    >
      <TocList
        headings={headings}
        activeId={activeId}
        baseLevel={minLevel}
        navigateToFragment={navigateToFragment}
      />
    </nav>
  );
}

function TocList({
  headings,
  activeId,
  baseLevel,
  navigateToFragment,
}: {
  headings: Heading[];
  activeId: string;
  baseLevel: number;
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
            onClick={navigateToFragment}
          />
          {children.length > 0 && (
            <ol className="toc-list">
              {children.map((child) => (
                <li key={child.id}>
                  <TocLink
                    heading={child}
                    isActive={activeId === child.id}
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
  onClick,
}: {
  heading: Heading;
  isActive: boolean;
  onClick: (id: string, opts?: { replace?: boolean }) => void;
}) {
  return (
    <a
      href={`#${heading.id}`}
      className={`toc-link${isActive ? " is-active-link" : ""}`}
      onClick={(e) => {
        e.preventDefault();
        onClick(heading.id, { replace: true });
      }}
    >
      {heading.text}
    </a>
  );
}
