import { createContext, useContext, type ReactNode } from "react";

type CodeToHtmlFn = (
  code: string,
  options: { lang: string; themes: Record<string, string> },
) => Promise<string>;

interface PlumContextValue {
  /** Portal target for YARL lightbox and Vaul drawer. null = document.body (default). */
  portalContainer: Element | null;
  /** Scroll container for ScrollToTop and TOC scroll spy. null = window (default). */
  scrollContainer: Element | null;
  /** Root for element lookups (getElementById equivalent). */
  contentRoot: Document | ShadowRoot;
  /** Fragment navigation handler. Override to skip pushState in extension. */
  navigateToFragment: (id: string, options?: { replace?: boolean }) => void;
  /** Custom Shiki codeToHtml function. null = dynamic import default. */
  codeToHtml: CodeToHtmlFn | null;
}

function defaultNavigateToFragment(id: string, { replace = false }: { replace?: boolean } = {}) {
  const el = document.getElementById(id);
  if (!el) {
    return;
  }

  el.scrollIntoView({ behavior: "smooth" });

  const url = `${window.location.pathname}${window.location.search}#${id}`;
  if (replace) {
    history.replaceState(null, "", url);
  } else {
    history.pushState(null, "", url);
  }
}

const PlumContext = createContext<PlumContextValue>({
  portalContainer: null,
  scrollContainer: null,
  contentRoot: document,
  navigateToFragment: defaultNavigateToFragment,
  codeToHtml: null,
});

export function usePlum() {
  return useContext(PlumContext);
}

interface PlumProviderProps extends Partial<PlumContextValue> {
  children: ReactNode;
}

export function PlumProvider({ children, ...overrides }: PlumProviderProps) {
  const value: PlumContextValue = {
    portalContainer: overrides.portalContainer ?? null,
    scrollContainer: overrides.scrollContainer ?? null,
    contentRoot: overrides.contentRoot ?? document,
    navigateToFragment: overrides.navigateToFragment ?? defaultNavigateToFragment,
    codeToHtml: overrides.codeToHtml ?? null,
  };

  return <PlumContext.Provider value={value}>{children}</PlumContext.Provider>;
}

export type { CodeToHtmlFn };
