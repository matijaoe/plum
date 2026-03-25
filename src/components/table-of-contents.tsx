import tocbot from "tocbot";
import { useEffect, useRef } from "react";
import type { Article } from "../reader";

interface TableOfContentsProps {
  article: Article;
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
        headingsOffset: 40,
        scrollSmooth: false,
        hasInnerContainers: true,
      });
    });

    return () => {
      cancelAnimationFrame(frame);
      tocbot.destroy();
    };
  }, [article]);

  return (
    <nav
      ref={tocRef}
      aria-label="Table of contents"
      className="js-toc fixed left-5 top-1/2 hidden max-h-[calc(100vh-8rem)] w-64 max-w-[calc(50vw-21rem)] -translate-y-1/2 overflow-y-auto overscroll-contain xl:block"
    />
  );
}
