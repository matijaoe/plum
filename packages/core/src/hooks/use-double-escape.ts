import { useEffect, useRef } from "react";

const DOUBLE_PRESS_MS = 500;

export function useDoubleEscape(onDoubleEscape: () => void) {
  const lastPressRef = useRef(0);

  useEffect(() => {
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

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onDoubleEscape]);
}
