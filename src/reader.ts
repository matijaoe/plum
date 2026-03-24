import { Readability } from "@mozilla/readability";
import DOMPurify from "dompurify";
import { ofetch } from "ofetch";
import { readingTime } from "reading-time-estimator";

import { hasProtocol } from "ufo";

export interface Article {
  title: string;
  content: string;
  byline: string | null;
  siteName: string;
  ogImage: string | null;
  publishedDate: string | null;
  readTime: number;
  lang: string | null;
  dir: string | null;
}

const PROXY_URL = import.meta.env.VITE_PROXY_URL as string;

export function normalizeUrl(raw: string): string {
  if (hasProtocol(raw)) {
    return raw;
  }
  return `https://${raw}`;
}

function fixConcatenatedNames(byline: string): string {
  return byline.replace(/([a-z])([A-Z])/g, "$1, $2");
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
  const publishedDateFromMeta =
    doc.querySelector('meta[property="article:published_time"]')?.getAttribute("content") ??
    doc.querySelector("time[datetime]")?.getAttribute("datetime") ??
    doc.querySelector('meta[name="date"]')?.getAttribute("content") ??
    doc.querySelector('meta[name="dcterms.date"]')?.getAttribute("content") ??
    doc.querySelector('meta[name="DC.date"]')?.getAttribute("content") ??
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

  // Strip site name suffix from title (e.g. "Article — SiteName" → "Article")
  let title = parsed.title ?? "";
  if (siteName) {
    const separators = [" – ", " — ", " | ", " · ", " - "];
    for (const sep of separators) {
      if (title.endsWith(`${sep}${siteName}`)) {
        title = title.slice(0, -`${sep}${siteName}`.length);
        break;
      }
    }
  }

  return {
    title,
    content,
    byline: parsed.byline ? fixConcatenatedNames(parsed.byline) : null,
    siteName,
    ogImage,
    publishedDate: publishedDateFromMeta ?? parsed.publishedTime ?? null,
    readTime: Math.max(1, readingTime(parsed.textContent ?? "").minutes),
    lang: parsed.lang ?? null,
    dir: parsed.dir ?? null,
  };
}
