import { useMemo, useState } from "react";
import type { Article } from "../reader";

interface Slide {
  src: string;
}

export function useArticleLightbox(article: Article) {
  const slides = useMemo<Slide[]>(() => {
    const srcs: string[] = [];

    if (article.ogImage) {
      srcs.push(article.ogImage);
    }

    const doc = new DOMParser().parseFromString(article.content, "text/html");
    for (const img of doc.querySelectorAll("img[src]")) {
      const src = img.getAttribute("src");
      if (src && !srcs.includes(src)) {
        srcs.push(src);
      }
    }

    return srcs.map((src) => ({ src }));
  }, [article.content, article.ogImage]);

  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  function openLightbox(src: string) {
    const i = slides.findIndex((s) => s.src === src);
    if (i >= 0) {
      setIndex(i);
      setOpen(true);
    }
  }

  return { slides, open, index, setIndex, setOpen, openLightbox };
}
