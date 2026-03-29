import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { navigateToFragment as defaultNavigateToFragment } from "./hooks/use-fragment-navigation";

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
  /** Whether a modal overlay (lightbox, drawer) is currently open. */
  overlayOpen: boolean;
  /** Call when an overlay opens or closes. Components use this to signal modal state. */
  onOverlayChange: (open: boolean) => void;
}

const PlumContext = createContext<PlumContextValue>({
  portalContainer: null,
  scrollContainer: null,
  contentRoot: document,
  navigateToFragment: defaultNavigateToFragment,
  codeToHtml: null,
  overlayOpen: false,
  onOverlayChange: () => {},
});

export function usePlum() {
  return useContext(PlumContext);
}

interface PlumProviderProps extends Partial<
  Omit<PlumContextValue, "overlayOpen" | "onOverlayChange">
> {
  children: ReactNode;
}

export function PlumProvider({ children, ...overrides }: PlumProviderProps) {
  const countRef = useRef(0);
  const [overlayOpen, setOverlayOpen] = useState(false);

  const onOverlayChange = useCallback((open: boolean) => {
    countRef.current += open ? 1 : -1;
    setOverlayOpen(countRef.current > 0);
  }, []);

  const value = useMemo<PlumContextValue>(
    () => ({
      portalContainer: overrides.portalContainer ?? null,
      scrollContainer: overrides.scrollContainer ?? null,
      contentRoot: overrides.contentRoot ?? document,
      navigateToFragment: overrides.navigateToFragment ?? defaultNavigateToFragment,
      codeToHtml: overrides.codeToHtml ?? null,
      overlayOpen,
      onOverlayChange,
    }),
    [
      overrides.portalContainer,
      overrides.scrollContainer,
      overrides.contentRoot,
      overrides.navigateToFragment,
      overrides.codeToHtml,
      overlayOpen,
      onOverlayChange,
    ],
  );

  return <PlumContext.Provider value={value}>{children}</PlumContext.Provider>;
}

export type { CodeToHtmlFn };
