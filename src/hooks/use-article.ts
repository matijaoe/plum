import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchArticle, normalizeUrl, validateUrl } from "../reader";

function getInitialUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("url") || null;
}

export function useArticle() {
  const [submittedUrl, setSubmittedUrl] = useState<string | null>(getInitialUrl);
  const isFirstRenderRef = useRef(true);
  const isPopstateRef = useRef(false);

  const {
    data: article = null,
    isLoading: loading,
    isError: error,
  } = useQuery({
    queryKey: ["article", submittedUrl],
    queryFn: () => fetchArticle(submittedUrl!),
    enabled: !!submittedUrl,
  });

  // Sync URL bar — replaceState on first render, pushState after
  useEffect(() => {
    if (isPopstateRef.current) {
      isPopstateRef.current = false;
      return;
    }

    const method = isFirstRenderRef.current ? "replaceState" : "pushState";
    isFirstRenderRef.current = false;

    if (submittedUrl) {
      const params = new URLSearchParams(window.location.search);
      params.set("url", submittedUrl);
      window.history[method](null, "", `?${params.toString()}`);
    } else {
      window.history[method](null, "", window.location.pathname);
    }
  }, [submittedUrl]);

  // Handle browser back/forward
  useEffect(() => {
    function handlePopstate() {
      isPopstateRef.current = true;
      const params = new URLSearchParams(window.location.search);
      setSubmittedUrl(params.get("url") || null);
    }

    window.addEventListener("popstate", handlePopstate);
    return () => window.removeEventListener("popstate", handlePopstate);
  }, []);

  const submitUrl = useCallback((raw: string) => {
    const normalized = validateUrl(raw);
    if (normalized) {
      setSubmittedUrl(raw.trim());
    }
  }, []);

  const clear = useCallback(() => {
    setSubmittedUrl(null);
  }, []);

  const sourceUrl = submittedUrl ? normalizeUrl(submittedUrl) : null;

  return {
    article,
    loading,
    error,
    sourceUrl,
    submitUrl,
    clear,
  };
}
