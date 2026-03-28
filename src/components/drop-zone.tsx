import clsx from "clsx";
import { ClipboardText } from "@phosphor-icons/react";
import { toast } from "sonner";
import { validateUrl } from "../reader";
import { getPlatformModifier } from "../utils";

interface DropZoneProps {
  isDragging: boolean;
  onUrl: (url: string) => void;
}

export function DropZone({ isDragging, onUrl }: DropZoneProps) {
  const modifier = getPlatformModifier();

  async function handlePasteClick() {
    try {
      const text = await navigator.clipboard.readText();
      const normalized = validateUrl(text);
      if (normalized) {
        onUrl(text.trim());
      } else {
        toast("No valid link in clipboard");
      }
    } catch {
      toast("Couldn't access clipboard");
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center">
      {/* Full-page tint + border on drag */}
      <div
        className={clsx(
          "pointer-events-none fixed inset-0 transition-opacity duration-300 ease-out",
          isDragging ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="absolute inset-4 rounded-2xl border-2 border-dashed border-foreground/15 bg-foreground/[0.025]" />
      </div>

      {/* Content */}
      <div
        className={clsx(
          "relative flex flex-col items-center gap-5 transition-transform duration-300 ease-out",
          isDragging && "scale-[1.02]",
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <p
            className={clsx(
              "font-serif text-lg transition-colors duration-200",
              isDragging ? "text-foreground" : "text-foreground font-light",
            )}
          >
            {isDragging ? "Drop to read" : "Paste a link to read"}
          </p>
          <p
            className={clsx(
              "text-xs text-muted transition-opacity duration-200",
              isDragging ? "opacity-0" : "opacity-100",
            )}
          >
            {modifier}V or drop here
          </p>
        </div>

        <button
          type="button"
          onClick={handlePasteClick}
          className={clsx(
            "flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 font-mono text-xs transition-[border-color,color,background-color,scale] duration-150 ease-out active:scale-[0.96]",
            isDragging
              ? "border-transparent opacity-0"
              : "border-border text-foreground hover:border-secondary hover:bg-foreground/[0.03]",
          )}
        >
          <ClipboardText size={14} />
          Paste
        </button>
      </div>
    </div>
  );
}
