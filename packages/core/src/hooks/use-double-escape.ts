import { useEffect, useRef } from "react";

const DOUBLE_PRESS_MS = 500;

export function useDoubleEscape(onDoubleEscape: () => void, enabled = true) {
  const lastPressRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      lastPressRef.current = 0;
      return;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") {
        return;
      }

      const now = Date.now();
      if (now - lastPressRef.current < DOUBLE_PRESS_MS) {
        lastPressRef.current = 0;
        onDoubleEscape();
      } else {
        lastPressRef.current = now;
      }
    }

    const controller = new AbortController();
    document.addEventListener("keydown", handleKeyDown, { signal: controller.signal });
    return () => controller.abort();
  }, [onDoubleEscape, enabled]);
}
