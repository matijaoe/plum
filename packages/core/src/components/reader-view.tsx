import clsx from "clsx";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { useIsMobile } from "../hooks/use-is-mobile";
import type { Article } from "../reader";
import { ArticleView } from "./article-view";
import type { MobileDrawerAction } from "./mobile-drawer";
import { ScrollToTop } from "./scroll-to-top";
import { TableOfContents } from "./table-of-contents";
import { ThemeToggle } from "./theme-toggle";

const TtsControls = lazy(async () => {
  const module = await import("./tts-controls");
  return { default: module.TtsControls };
});

const MobileDrawer = lazy(async () => {
  const module = await import("./mobile-drawer");
  return { default: module.MobileDrawer };
});

interface ReaderViewProps {
  article: Article;
  sourceUrl: string;
  /** Top-left action button (e.g. close/new article). Hidden on mobile. */
  actionButton?: ReactNode;
  /** Actions shown in the mobile drawer. */
  drawerActions: MobileDrawerAction[];
  /** Additional className on the main prose container. */
  mainClassName?: string;
}

export function ReaderView({
  article,
  sourceUrl,
  actionButton,
  drawerActions,
  mainClassName,
}: ReaderViewProps) {
  const isMobile = useIsMobile();
  const [showDeferredUi, setShowDeferredUi] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setShowDeferredUi(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      {/* Top controls — hidden on mobile */}
      {!isMobile && (
        <div
          className={clsx(
            "flex items-center justify-between p-3",
            "md:pointer-events-none md:fixed md:inset-x-0 md:top-0 md:z-20",
          )}
        >
          {actionButton ?? <div />}
          <div className="md:pointer-events-auto">
            <ThemeToggle />
          </div>
        </div>
      )}

      <ScrollToTop />
      <TableOfContents article={article} />

      <main className={clsx("mx-auto max-w-content px-4 pt-4 pb-40 md:pt-12", mainClassName)}>
        <ArticleView key={sourceUrl} article={article} sourceUrl={sourceUrl} />
      </main>

      {/* Desktop: floating TTS player */}
      {!isMobile && showDeferredUi && (
        <Suspense fallback={null}>
          <div className="fixed bottom-5 left-5 z-20">
            <TtsControls articleHtml={article.content} />
          </div>
        </Suspense>
      )}

      {/* Mobile: bottom drawer */}
      {isMobile && showDeferredUi && (
        <Suspense fallback={null}>
          <MobileDrawer articleHtml={article.content} actions={drawerActions} />
        </Suspense>
      )}
    </>
  );
}
