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
