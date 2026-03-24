const CHUNK_MAX_LENGTH = 200;

const SENTENCE_BOUNDARY = /(?<=[.!?])\s+(?=[A-Z\u00C0-\u024F"])/;

export function extractTextFromHtml(html: string): string {
  const el = document.createElement("div");
  el.innerHTML = html;
  return el.innerText;
}

export function splitIntoChunks(text: string): string[] {
  const sentences = text.split(SENTENCE_BOUNDARY);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) {
      continue;
    }

    if (current && current.length + trimmed.length + 1 > CHUNK_MAX_LENGTH) {
      chunks.push(current);
      current = trimmed;
    } else {
      current = current ? `${current} ${trimmed}` : trimmed;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}
