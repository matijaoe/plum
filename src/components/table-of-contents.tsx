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
        scrollHandlerType: "throttle",
        throttleTimeout: 0,
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
      className="js-toc fixed left-6 top-20 hidden max-h-[calc(100vh-8rem)] w-56 max-w-[calc(50vw-21rem)] overflow-y-auto overscroll-contain xl:block"
    />
  );
}
