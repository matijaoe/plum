export const RATES = [0.75, 1, 1.25, 1.5, 2] as const;

export const springTap = {
  type: "spring" as const,
  stiffness: 400,
  damping: 25,
};

export function extractText(html: string): string {
  const el = document.createElement("div");
  el.innerHTML = html;
  return el.textContent || "";
}

export function getPlatformModifier(): string {
  return /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";
}

export async function downloadUrl(url: string) {
  const name = url.split("/").pop() || "download";
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = name;
    a.click();
    URL.revokeObjectURL(blobUrl);
  } catch {
    // Cross-origin fetch blocked — fall back to new tab
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export async function copyText(text: string, html?: string): Promise<boolean> {
  try {
    if (html && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
      return true;
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back to a local selection-based copy path below.
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.cssText =
    "position:fixed;top:0;left:0;opacity:0;pointer-events:none;contain:strict;";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    textarea.remove();
  }
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) {
    return dateStr;
  }
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
