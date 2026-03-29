import { useState } from "react";
import type { Article } from "../reader";

interface Slide {
  src: string;
}

function collectSlides(article: Article): Slide[] {
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
}

export function useArticleLightbox(article: Article) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  function openLightbox(src: string) {
    const nextSlides = slides.length > 0 ? slides : collectSlides(article);
    if (slides.length === 0) {
      setSlides(nextSlides);
    }

    const i = nextSlides.findIndex((slide) => slide.src === src);
    if (i >= 0) {
      setIndex(i);
      setOpen(true);
    }
  }

  return { slides, open, index, setIndex, setOpen, openLightbox };
}
