import { ArrowUp } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

const SCROLL_THRESHOLD = 400;

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > SCROLL_THRESHOLD);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="Scroll to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-[calc(1.5rem+var(--sai-bottom))] right-5 z-20 flex size-11 cursor-pointer items-center justify-center rounded-full border border-border-subtle bg-elevated text-muted shadow-sm transition-[color,opacity,scale] duration-150 ease-out active:scale-[0.96] md:bottom-5 md:size-10 md:border-transparent md:bg-transparent md:shadow-none md:hover:bg-border-subtle md:hover:text-foreground"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.85)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <ArrowUp size={18} weight="bold" />
    </button>
  );
}
