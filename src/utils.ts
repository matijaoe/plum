export function getPlatformModifier(): string {
  return /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";
}

export function downloadUrl(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = url.split("/").pop() || "download";
  a.click();
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
