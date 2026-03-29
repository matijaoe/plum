const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const { searchParams } = new URL(request.url);
    const target = searchParams.get("url");

    if (!target) {
      return new Response("Missing ?url= parameter", { status: 400, headers: CORS_HEADERS });
    }

    try {
      const resp = await fetch(target, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; PlumProxy/1.0)" },
      });
      const html = await resp.text();
      return new Response(html, {
        status: resp.status,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": resp.headers.get("Content-Type") || "text/html",
        },
      });
    } catch {
      return new Response("Failed to fetch target URL", { status: 502, headers: CORS_HEADERS });
    }
  },
};
