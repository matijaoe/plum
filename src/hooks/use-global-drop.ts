import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { validateUrl } from "../reader";

export function useGlobalDrop(onUrl: (url: string) => void) {
  const [isDragging, setIsDragging] = useState(false);
  const counterRef = useRef(0);

  useEffect(() => {
    function handleDragEnter(e: DragEvent) {
      e.preventDefault();
      counterRef.current++;
      setIsDragging(true);
    }

    function handleDragOver(e: DragEvent) {
      e.preventDefault();
    }

    function handleDragLeave(e: DragEvent) {
      e.preventDefault();
      counterRef.current--;
      if (counterRef.current <= 0 || e.relatedTarget === null) {
        counterRef.current = 0;
        setIsDragging(false);
      }
    }

    function handleDrop(e: DragEvent) {
      e.preventDefault();
      counterRef.current = 0;
      setIsDragging(false);

      const text =
        e.dataTransfer?.getData("text/uri-list") || e.dataTransfer?.getData("text/plain");
      if (!text) {
        toast("Couldn't read the dropped item");
        return;
      }
      const normalized = validateUrl(text);
      if (normalized) {
        onUrl(text.trim());
      } else {
        toast("Not a valid link");
      }
    }

    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleDrop);

    return () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleDrop);
    };
  }, [onUrl]);

  return { isDragging };
}
