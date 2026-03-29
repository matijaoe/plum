import { Check, Copy } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { copyText } from "../utils";

const iconTransition = { type: "spring" as const, duration: 0.3, bounce: 0 };

export function CodeCopyButton({ pre }: { pre: HTMLPreElement }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const code = pre.querySelector("code");
      const text = code?.textContent ?? pre.textContent ?? "";
      const html = `<pre><code>${code?.innerHTML ?? pre.innerHTML}</code></pre>`;
      void copyText(text, html).then((didCopy) => {
        if (!didCopy) {
          return;
        }

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        setCopied(true);
        timeoutRef.current = setTimeout(() => {
          setCopied(false);
          timeoutRef.current = null;
        }, 2000);
      });
    },
    [pre],
  );

  useEffect(() => {
    const onEnter = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setCopied(false);
    };
    pre.addEventListener("mouseenter", onEnter);
    return () => pre.removeEventListener("mouseenter", onEnter);
  }, [pre]);

  return (
    <button type="button" onClick={handleClick} aria-label="Copy code" className="code-copy-btn">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={copied ? "check" : "copy"}
          initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
          transition={iconTransition}
          className="flex items-center justify-center"
        >
          {copied ? <Check size={14} weight="bold" /> : <Copy size={14} weight="bold" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
