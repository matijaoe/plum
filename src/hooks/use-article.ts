import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { fetchArticle, normalizeUrl, validateUrl } from "../reader";

function getInitialUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("url") || null;
}

export function useArticle() {
  const queryClient = useQueryClient();
  const [submittedUrl, setSubmittedUrl] = useState<string | null>(getInitialUrl);
  const isFirstRenderRef = useRef(true);
  const isPopstateRef = useRef(false);
  const confirmedRef = useRef(!!getInitialUrl());
  const wasClearedRef = useRef(false);

  const { data: article = null, isLoading: loading } = useQuery({
    queryKey: ["article", submittedUrl],
    queryFn: () => fetchArticle(submittedUrl!),
    enabled: !!submittedUrl,
    // Keep the previous article visible during article-to-article transitions,
    // but suppress it after an explicit clear so stale content never flashes.
    placeholderData: (prev) => (wasClearedRef.current ? undefined : prev),
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
      const hash = params.get("url") === submittedUrl ? window.location.hash : "";
      params.set("url", submittedUrl);
      window.history.replaceState(null, "", `?${params.toString()}${hash}`);
    } else {
      window.history.pushState(null, "", window.location.pathname);
    }
  }, [submittedUrl]);

  // Reset cleared flag once a new article actually loads
  useEffect(() => {
    if (article && submittedUrl) {
      wasClearedRef.current = false;
    }
  }, [article, submittedUrl]);

  // Create history entry when article successfully loads
  useEffect(() => {
    if (article && submittedUrl && !confirmedRef.current) {
      confirmedRef.current = true;
      const params = new URLSearchParams(window.location.search);
      params.set("url", submittedUrl);
      window.history.pushState(null, "", `?${params.toString()}${window.location.hash}`);
    }
  }, [article, submittedUrl]);

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
    async (raw: string) => {
      const normalized = validateUrl(raw);
      if (!normalized) {
        return;
      }
      try {
        await queryClient.fetchQuery({
          queryKey: ["article", raw.trim()],
          queryFn: () => fetchArticle(raw.trim()),
        });
        confirmedRef.current = false;
        setSubmittedUrl(raw.trim());
      } catch (e) {
        const message =
          e instanceof Error && e.message === "Failed to parse article"
            ? "Couldn't extract article from this page"
            : "Couldn't load this link";
        toast(message);
      }
    },
    [queryClient],
  );

  const clear = useCallback(() => {
    wasClearedRef.current = true;
    setSubmittedUrl(null);
  }, []);

  const sourceUrl = submittedUrl ? normalizeUrl(submittedUrl) : null;

  return {
    article,
    loading,
    sourceUrl,
    submitUrl,
    clear,
  };
}
