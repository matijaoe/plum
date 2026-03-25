import clsx from "clsx";
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
      }
    } catch {
      // Clipboard API denied (e.g. Firefox) — silently fail
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center">
      {/* Amber tint overlay on drag */}
      <div
        className={clsx(
          "pointer-events-none absolute inset-0 transition-colors duration-200",
          isDragging ? "bg-amber-500/[0.04]" : "bg-transparent",
        )}
      />

      {/* Content */}
      <div className="relative flex flex-col items-center gap-5">
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-sm text-foreground">Paste a link to read</p>
          <p className="text-xs text-muted">
            {isDragging ? "Drop to read" : `${modifier}V or drop here`}
          </p>
        </div>

        <button
          type="button"
          onClick={handlePasteClick}
          className="cursor-pointer rounded-md border border-border bg-elevated px-4 py-1.5 font-mono text-xs text-secondary transition-colors hover:border-foreground hover:text-foreground"
        >
          Paste
        </button>
      </div>
    </div>
  );
}
