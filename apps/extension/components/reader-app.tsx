import { startTransition, useEffect, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { parseArticle, type Article } from "@plum/core";
import { ReaderOverlay } from "./reader-overlay";

interface ReaderSession {
  html: string;
  sourceUrl: string;
}

type ReaderState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; article: Article; sourceUrl: string };

function StatusView({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background font-sans text-foreground">
      <div className="mx-auto max-w-content px-4 pt-12 pb-40">
        {typeof children === "string" ? (
          <div className="flex min-h-[40dvh] items-center justify-center text-center text-sm text-secondary">
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function ReaderApp() {
  const [state, setState] = useState<ReaderState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const readerId = new URLSearchParams(window.location.search).get("id");
      if (!readerId) {
        setState({ status: "error", message: "Missing reader session." });
        return;
      }

      const key = `reader-${readerId}`;
      const stored = await browser.storage.session.get(key);
      if (cancelled) {
        return;
      }

      const data = stored[key] as ReaderSession | undefined;
      if (!data) {
        setState({ status: "error", message: "This reader session is no longer available." });
        return;
      }

      void browser.storage.session.remove(key);

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      let article: Article | null = null;
      try {
        article = parseArticle(data.html, data.sourceUrl);
      } catch {
        article = null;
      }

      if (cancelled) {
        return;
      }

      if (!article) {
        setState({ status: "error", message: "Could not parse article from this page." });
        return;
      }

      startTransition(() => {
        setState({ status: "ready", article, sourceUrl: data.sourceUrl });
      });
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return null;
  }

  if (state.status === "error") {
    return <StatusView>{state.message}</StatusView>;
  }

  return (
    <ReaderOverlay
      article={state.article}
      sourceUrl={state.sourceUrl}
      onExit={() => window.parent.postMessage({ type: "reader-exit" }, "*")}
    />
  );
}

const container = document.getElementById("root");
if (!container) {
  document.body.textContent = "Missing reader root.";
} else {
  const root =
    (window as typeof window & { __readerRoot?: Root }).__readerRoot ?? createRoot(container);
  (window as typeof window & { __readerRoot?: Root }).__readerRoot = root;
  root.render(<ReaderApp />);
}
