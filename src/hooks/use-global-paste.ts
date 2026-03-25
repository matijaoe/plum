import { useEffect } from "react";
import { validateUrl } from "../reader";

export function useGlobalPaste(onUrl: (url: string) => void) {
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const text = e.clipboardData?.getData("text/plain");
      if (!text) {
        return;
      }
      const normalized = validateUrl(text);
      if (normalized) {
        e.preventDefault();
        onUrl(text.trim());
      }
    }

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [onUrl]);
}
