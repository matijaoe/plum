import { Readability } from "@mozilla/readability";
import DOMPurify from "dompurify";
import { ofetch } from "ofetch";
import { readingTime } from "reading-time-estimator";

export interface Article {
  title: string;
  content: string;
  byline: string | null;
  siteName: string;
  ogImage: string | null;
  publishedDate: string | null;
  readTime: number;
}

const PROXY_URL = import.meta.env.VITE_PROXY_URL as string;

export function normalizeUrl(raw: string): string {
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }
  return `https://${raw}`;
}

async function fetchHtml(url: string): Promise<string> {
  return ofetch(`${PROXY_URL}/`, {
    query: { url },
    responseType: "text",
  });
}

export async function fetchArticle(rawUrl: string): Promise<Article> {
  const normalizedUrl = normalizeUrl(rawUrl);
  const html = await fetchHtml(normalizedUrl);

  const doc = new DOMParser().parseFromString(html, "text/html");
  const base = doc.createElement("base");
  base.href = normalizedUrl;
  doc.head.prepend(base);

  const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? null;
  const ogSiteName =
    doc.querySelector('meta[property="og:site_name"]')?.getAttribute("content") ?? null;
  const publishedDate =
    doc.querySelector('meta[property="article:published_time"]')?.getAttribute("content") ??
    doc.querySelector("time[datetime]")?.getAttribute("datetime") ??
    doc.querySelector('meta[name="date"]')?.getAttribute("content") ??
    null;

  // Capture language classes before Readability strips them
  const langMap = new Map<string, string>();
  for (const code of doc.querySelectorAll("pre > code[class*='language-']")) {
    const lang = [...code.classList].find((c) => c.startsWith("language-"));
    if (lang) {
      const text = (code.textContent ?? "").slice(0, 80);
      langMap.set(text, lang);
    }
  }

  const parsed = new Readability(doc).parse();
  if (!parsed) {
    throw new Error("Failed to parse article");
  }

  const rawContent = parsed.content ?? "";
  let content = DOMPurify.sanitize(rawContent, { FORBID_TAGS: ["style"] });

  // Re-apply language classes stripped by Readability
  if (langMap.size > 0) {
    const tmp = new DOMParser().parseFromString(content, "text/html");
    for (const code of tmp.querySelectorAll("pre > code")) {
      const text = (code.textContent ?? "").slice(0, 80);
      const lang = langMap.get(text);
      if (lang) {
        code.classList.add(lang);
      }
    }
    content = tmp.body.innerHTML;
  }

  let siteName = parsed.siteName ?? ogSiteName;
  if (!siteName) {
    try {
      siteName = new URL(normalizedUrl).hostname;
    } catch {
      siteName = normalizedUrl;
    }
  }

  return {
    title: parsed.title ?? "",
    content,
    byline: parsed.byline ?? null,
    siteName,
    ogImage,
    publishedDate,
    readTime: Math.max(1, readingTime(parsed.textContent ?? "").minutes),
  };
}
