import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchArticle, normalizeUrl } from "../reader";

function getInitialUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("url") ?? "";
}

export function useArticle() {
  const [inputUrl, setInputUrl] = useState(getInitialUrl);
  const [submittedUrl, setSubmittedUrl] = useState<string | null>(() => getInitialUrl() || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const resolvedUrl = useMemo(() => {
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      return null;
    }
    try {
      new URL(normalizeUrl(trimmed));
      return trimmed;
    } catch {
      return null;
    }
  }, [inputUrl]);

  const {
    data: article = null,
    isLoading: loading,
    isError: error,
  } = useQuery({
    queryKey: ["article", submittedUrl],
    queryFn: () => fetchArticle(submittedUrl!),
    enabled: !!submittedUrl,
  });

  useEffect(() => {
    if (submittedUrl) {
      const params = new URLSearchParams(window.location.search);
      params.set("url", submittedUrl);
      window.history.replaceState(null, "", `?${params.toString()}`);
    } else {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [submittedUrl]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resolvedUrl || loading) {
      return;
    }
    setSubmittedUrl(resolvedUrl);
  }

  function handleClear() {
    setSubmittedUrl(null);
    setInputUrl("");
    inputRef.current?.focus();
  }

  return {
    url: inputUrl,
    setUrl: setInputUrl,
    article,
    loading,
    error,
    resolvedUrl,
    inputRef,
    handleSubmit,
    handleClear,
  };
}
