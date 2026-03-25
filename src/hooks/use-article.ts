import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { fetchArticle, normalizeUrl, validateUrl } from "../reader";

function getInitialUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("url") || null;
}

export function useArticle() {
  const [submittedUrl, setSubmittedUrl] = useState<string | null>(getInitialUrl);
  const isFirstRenderRef = useRef(true);
  const isPopstateRef = useRef(false);
  const isRestoringRef = useRef(false);
  const confirmedRef = useRef(!!getInitialUrl());
  const prevUrlRef = useRef<string | null>(null);

  const {
    data: article = null,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["article", submittedUrl],
    queryFn: () => fetchArticle(submittedUrl!),
    enabled: !!submittedUrl,
    placeholderData: keepPreviousData,
  });

  // Keep URL bar in sync
  useEffect(() => {
    if (isPopstateRef.current) {
      isPopstateRef.current = false;
      return;
    }

    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    if (submittedUrl) {
      const params = new URLSearchParams(window.location.search);
      params.set("url", submittedUrl);
      window.history.replaceState(null, "", `?${params.toString()}${window.location.hash}`);
    } else if (isRestoringRef.current) {
      // Error recovery — don't create history entry
      isRestoringRef.current = false;
      window.history.replaceState(null, "", window.location.pathname);
    } else {
      window.history.pushState(null, "", window.location.pathname);
    }
  }, [submittedUrl]);

  // Create history entry when article successfully loads
  useEffect(() => {
    if (article && submittedUrl && !confirmedRef.current) {
      confirmedRef.current = true;
      const params = new URLSearchParams(window.location.search);
      params.set("url", submittedUrl);
      window.history.pushState(null, "", `?${params.toString()}${window.location.hash}`);
    }
  }, [article, submittedUrl]);

  // On error, restore previous URL and show toast
  useEffect(() => {
    if (!error) {
      return;
    }
    const message =
      error instanceof Error && error.message === "Failed to parse article"
        ? "Couldn't extract article from this page"
        : "Couldn't load this link";
    toast(message);

    isRestoringRef.current = true;
    setSubmittedUrl(prevUrlRef.current);
  }, [error]);

  // Handle browser back/forward
  useEffect(() => {
    function handlePopstate() {
      isPopstateRef.current = true;
      confirmedRef.current = true;
      const params = new URLSearchParams(window.location.search);
      setSubmittedUrl(params.get("url") || null);
    }

    window.addEventListener("popstate", handlePopstate);
    return () => window.removeEventListener("popstate", handlePopstate);
  }, []);

  const submitUrl = useCallback(
    (raw: string) => {
      const normalized = validateUrl(raw);
      if (normalized) {
        prevUrlRef.current = submittedUrl;
        confirmedRef.current = false;
        setSubmittedUrl(raw.trim());
      }
    },
    [submittedUrl],
  );

  const clear = useCallback(() => {
    prevUrlRef.current = null;
    setSubmittedUrl(null);
  }, []);

  // Show the previous article's URL while a new one is loading
  const displayUrl = article ? (submittedUrl ?? prevUrlRef.current) : submittedUrl;
  const sourceUrl = displayUrl ? normalizeUrl(displayUrl) : null;

  return {
    article,
    loading,
    sourceUrl,
    submitUrl,
    clear,
  };
}
