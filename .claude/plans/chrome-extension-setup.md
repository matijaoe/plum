# Plum Chrome Extension — Implementation Plan

## Context

Build a WXT-based Chrome extension that reuses `@plum/core` to render articles in reader mode directly on the current page. The extension reads the page's DOM, parses it with `extractArticleFromDom`, and replaces the visible content with Plum's reader view inside a shadow root. Everything should match the web app exactly — same components, fonts, styles, features.

The extension is already scaffolded at `apps/extension/` via `npx wxt@latest init` (React template).

## Key Research Findings

### Shadow root compatibility audit

| Component              | Issue                                                                         | Solution                                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **YARL lightbox**      | Portals to `document.body`                                                    | Use `portal={{ root: container }}` prop (first-party API)                                                             |
| **Vaul drawer**        | Portals to `document.body`                                                    | Use `container` prop on `<Drawer.Portal>`                                                                             |
| **tocbot**             | Uses `document.querySelector` for scroll tracking — can't pierce shadow roots | Replace with custom IntersectionObserver-based scroll spy                                                             |
| **ScrollToTop**        | Hardcodes `window.scrollY` / `window.scrollTo`                                | Read scroll container from context                                                                                    |
| **navigateToFragment** | Uses `document.getElementById` + `history.pushState`                          | Use context's content root for lookup; skip pushState in extension                                                    |
| **Shiki**              | WASM engine blocked by host page CSP in content scripts                       | Use Shiki's JS engine (`createJavaScriptRegExpEngine`) — pure JS, no CSP issues                                       |
| **next-themes**        | Sets class on `<html>`, not shadow host                                       | Keep as state manager; bridge `resolvedTheme` to shadow host via useEffect                                            |
| **Google Fonts**       | `<link>` in `<head>` doesn't auto-exist in extension                          | Inject `<link>` into `document.head`; `@font-face` is document-scoped, `font-family` inherits through shadow boundary |
| **Sonner**             | Not used in core                                                              | Web-app-only, no concern                                                                                              |
| **CodeCopyButton**     | Uses `navigator.clipboard` + local state                                      | Works as-is                                                                                                           |
| **useDoubleEscape**    | Listens on `document`                                                         | Not used in extension (extension uses single Escape)                                                                  |

### Activation model (from reader extension research)

Modern reader extensions (Reader View, Just Read) use **programmatic injection** — NOT `matches: ['<all_urls>']` content scripts:

- Background listens for `browser.action.onClicked`
- Injects content script via `browser.scripting.executeScript`
- Only needs `activeTab` + `scripting` permissions (no scary install warning)
- Zero overhead on pages user doesn't activate

### History/pushState (from reader extension research)

Reader extensions do NOT modify the host page URL. Reader View does pure `scrollIntoView` with no pushState for in-page navigation. We do the same.

### Keyboard shortcuts

| Shortcut      | Web                    | Extension                                          | Notes                                                  |
| ------------- | ---------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| Double Escape | Clear article          | **Disabled**                                       | Extension uses single Escape                           |
| Escape        | Stop TTS (when active) | Stop TTS (when active), otherwise exit reader mode | TTS takes priority                                     |
| S             | Open source URL        | Open source URL                                    | Same                                                   |
| D             | Download image         | Download image                                     | Same (when lightbox open)                              |
| L             | Toggle TTS             | Toggle TTS                                         | Same                                                   |
| Space         | Play/pause TTS         | Play/pause TTS                                     | Same (when TTS active)                                 |
| Cmd+J         | Toggle theme           | Toggle theme                                       | Same                                                   |
| O             | —                      | **Open in Plum web app**                           | Extension-only, opens `plum-reader.vercel.app?url=...` |

Handled via composition: web `App.tsx` uses `useDoubleEscape`; extension overlay uses its own Escape handler. Same core components, different app-level wiring.

---

## Architecture: PlumContext

A single React context in `@plum/core` that components read from to adapt behavior:

```tsx
interface PlumContextValue {
  portalContainer: Element | null; // YARL, Vaul portals (null = document.body default)
  scrollContainer: Element | null; // ScrollToTop, TOC scroll spy (null = window)
  contentRoot: Document | ShadowRoot; // Element lookups (default: document)
  navigateToFragment: (id: string, opts?: { replace?: boolean }) => void;
  codeToHtml: ((code: string, opts: any) => Promise<string>) | null; // null = default Shiki import
}
```

**Web app**: wraps with `<PlumProvider>` using all defaults — zero behavioral change.
**Extension**: provides shadow root container, custom navigateToFragment (no pushState), Shiki JS engine codeToHtml.

---

## Staged Implementation

### Stage 1: PlumContext + core adaptations

Create the context and update core components to read from it. Web app wraps with defaults — must work identically after this stage.

**New files:**

- `packages/core/src/plum-context.tsx` — Context, provider, `usePlum()` hook

**Modified files:**

- `packages/core/src/index.ts` — Export `PlumProvider`, `usePlum`
- `packages/core/src/components/article-view.tsx`
  - Read `portalContainer` from context → pass `portal={{ root: portalContainer }}` to `<Lightbox>`
  - Read `codeToHtml` from context → pass to `highlightCodeBlocks`
  - Read `navigateToFragment` from context → use for anchor clicks
- `packages/core/src/highlight.ts`
  - `highlightCodeBlocks(container, signal, codeToHtml?)` — optional param; if provided, use it instead of `await import("shiki")`
- `packages/core/src/components/scroll-to-top.tsx`
  - Read `scrollContainer` from context
  - If container: listen to `container.scroll`, check `container.scrollTop`, call `container.scrollTo`
  - If null: current window behavior (default)
- `packages/core/src/hooks/use-fragment-navigation.ts`
  - No longer a standalone export — becomes the **default** implementation provided by PlumContext
  - Default: current behavior (scrollIntoView + pushState)
  - Extension provides override: scrollIntoView only, using `contentRoot` for element lookup
- `apps/web/src/main.tsx` — Wrap with `<PlumProvider>` (no props = all defaults)

**Verify:** `vp dev` from root — web app works identically. All features: TOC, lightbox, TTS, theme, scroll-to-top, code highlighting.

### Stage 2: Replace tocbot with custom TOC scroll spy

tocbot cannot work in shadow roots (`document.querySelector` can't pierce shadow boundary). Replace with a custom IntersectionObserver-based solution that works in both contexts.

**Modified files:**

- `packages/core/src/components/table-of-contents.tsx`
  - Extract headings from the article DOM (h2, h3, h4 — same selectors as tocbot)
  - Render nested link list (same HTML structure, same CSS classes: `toc-link`, `is-active-link`, `is-active-li`, `node-name--H2/H3/H4`)
  - IntersectionObserver on headings within `scrollContainer` (from context) for active tracking
  - Uses `navigateToFragment` from context for click handling
  - `useActivateLastSectionAtBottom` updated to use scroll container from context
- `packages/core/package.json` — Remove `tocbot` dependency

**Verify:** Web app TOC works identically — correct heading list, active heading tracking on scroll, click navigation, last-section-at-bottom activation.

### Stage 3: Move MobileDrawer to core

Currently in `apps/web/src/components/mobile-drawer.tsx`. Both web and extension need it.

**Moved files:**

- `apps/web/src/components/mobile-drawer.tsx` → `packages/core/src/components/mobile-drawer.tsx`

**Changes to MobileDrawer:**

- Read `portalContainer` from context → pass as `container` to `<Drawer.Portal>`
- Parameterize the action button: accept `actions` prop (array of `{ label, icon, onClick }`) instead of hardcoded "Read new article"
- Export from `packages/core/src/index.ts`

**Modified files:**

- `apps/web/src/App.tsx` — Import `MobileDrawer` from `@plum/core` instead of `./components/mobile-drawer`; pass `actions={[{ label: "Read new article", icon: Plus, onClick: clear }]}`
- `packages/core/src/index.ts` — Export MobileDrawer

**Verify:** Web app mobile drawer works identically — TTS controls, theme toggle, "Read new article" action.

### Stage 4: Extension scaffold + WXT configuration

Configure the already-scaffolded WXT project for the monorepo.

**Modified files:**

- `apps/extension/package.json`
  - Name: `@plum/extension`
  - Add `"@plum/core": "workspace:*"` dependency
  - Add shared deps: `react`, `react-dom`, `next-themes`, `motion`, `shiki`, `@phosphor-icons/react`, `@tanstack/react-hotkeys`, `react-text-to-speech`, `vaul`, `yet-another-react-lightbox`, `clsx`
  - Add dev deps: `@tailwindcss/vite`, `@tailwindcss/typography`, `tailwindcss`
  - Keep `postinstall: "wxt prepare"`
- `apps/extension/wxt.config.ts`
  - Add `@tailwindcss/vite` and `@vitejs/plugin-react` to Vite plugins (note: `@wxt-dev/module-react` may handle React — verify)
  - Configure manifest: `name: "Plum Reader"`, `description`, `permissions: ['activeTab', 'scripting']`, `action: {}`
  - Configure alias: `@plum/core` → `../../packages/core/src`
- `apps/extension/tsconfig.json` — Extend `.wxt/tsconfig.json`, add `jsx: "react-jsx"`, paths for `@plum/core`

**Deleted files:**

- `apps/extension/entrypoints/popup/` (entire directory — not needed)
- `apps/extension/assets/react.svg`
- `apps/extension/public/wxt.svg`

**New files:**

- `apps/extension/entrypoints/content/index.tsx` — Content script entry (replaces `content.ts`)
- `apps/extension/entrypoints/content/index.css` — Tailwind entry:
  ```css
  @import "tailwindcss" source("../../../..");
  @plugin "@tailwindcss/typography";
  @import "@plum/core/styles.css";
  ```

**Deleted files:**

- `apps/extension/entrypoints/content.ts` (replaced by content/index.tsx)

**Verify:** `vp install` from root, then `wxt prepare` from `apps/extension/`. TypeScript resolves `@plum/core`. `wxt build` produces output.

### Stage 5: Extension content script + background + reader overlay

The main implementation stage. Content script parses the page, creates shadow root, mounts the reader view.

**Modified files:**

- `apps/extension/entrypoints/background.ts`

  ```ts
  export default defineBackground(() => {
    browser.action.onClicked.addListener(async (tab) => {
      if (tab.id) {
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          files: [
            /* content script path */
          ],
        });
      }
    });
  });
  ```

- `apps/extension/entrypoints/content/index.tsx`
  - `defineContentScript` with `cssInjectionMode: 'ui'`
  - `createShadowRootUi` to mount React into shadow root
  - Parse page: `extractArticleFromDom(document.cloneNode(true), location.href)`
  - If parsing fails: log and bail (no toast needed)
  - If succeeds: render `ReaderOverlay` with parsed article
  - Inject Google Fonts `<link>` into `document.head`

**New files:**

- `apps/extension/components/reader-overlay.tsx`
  - Composition root (equivalent of web `App.tsx`)
  - Wraps with `ThemeProvider` + `PlumProvider` (providing shadow root containers)
  - Theme bridge: `useEffect` that mirrors `resolvedTheme` onto shadow host class
  - Initialize Shiki highlighter with `createJavaScriptRegExpEngine`, provide `codeToHtml` via context
  - Custom `navigateToFragment`: `contentRoot.querySelector('#' + CSS.escape(id))?.scrollIntoView()` — no pushState
  - Layout: same as web App.tsx
    - `ThemeToggle` (top right)
    - `TableOfContents` (left sidebar on xl)
    - `ArticleView` (center prose)
    - `TtsControls` (bottom left, desktop)
    - `MobileDrawer` (mobile) — action: "Exit reader mode"
    - `ScrollToTop` (bottom right)
  - Close button (X) to exit reader mode
  - Single Escape: exit reader mode (only when TTS is NOT active)
  - `O` hotkey: opens `https://plum-reader.vercel.app?url={encodeURIComponent(location.href)}` in new tab

**Verify:** Load extension in Chrome (`wxt dev`), navigate to an article, click icon. Verify: article renders, typography correct, theme toggle works, TTS works, TOC tracks headings, lightbox works, code highlighting works, Escape exits, "Open in Plum" shortcut works, mobile drawer works at narrow widths.

### Stage 6: Icons + final polish

- Replace placeholder icons with Plum icons (generate from `favicon.svg` or design new ones)
  - `public/icon/16.png`, `32.png`, `48.png`, `96.png`, `128.png`
- Remove `apps/extension/PLAN.md` and `apps/extension/README.md`
- Remove leftover boilerplate files (`.gitignore` if duplicate, etc.)
- `wxt build` + `wxt zip` verification

**Verify:** Full end-to-end test. Build succeeds. Zip is clean. Extension works on: blog posts, news articles, documentation pages, pages with code blocks, pages with images, pages with RTL content.

---

## Critical Files Reference

### Core components to modify

- `packages/core/src/components/article-view.tsx` — YARL portal, codeToHtml, navigateToFragment
- `packages/core/src/components/table-of-contents.tsx` — Replace tocbot with IntersectionObserver
- `packages/core/src/components/scroll-to-top.tsx` — Scroll container from context
- `packages/core/src/highlight.ts` — Accept optional codeToHtml param
- `packages/core/src/hooks/use-fragment-navigation.ts` — Default impl for context

### Core components that need NO changes

- `packages/core/src/components/theme-toggle.tsx` — Works via useTheme()
- `packages/core/src/components/tts-controls.tsx` — Works as-is, hotkeys bubble through shadow root
- `packages/core/src/components/equalizer.tsx` — Pure visual
- `packages/core/src/components/code-copy-button.tsx` — Uses navigator.clipboard + local state
- `packages/core/src/hooks/use-is-mobile.ts` — Uses matchMedia, works anywhere
- `packages/core/src/hooks/use-double-escape.ts` — Not used in extension (composition difference)
- `packages/core/src/hooks/use-article-lightbox.ts` — Pure React state
- `packages/core/src/index.css` — Styles work inside shadow root via cssInjectionMode: 'ui'
- `packages/core/src/reader.ts` — extractArticleFromDom, pure function

### Web app files to modify (minimal)

- `apps/web/src/main.tsx` — Add PlumProvider wrapper
- `apps/web/src/App.tsx` — Import MobileDrawer from @plum/core

---

## Open Questions / Risks

1. **WXT content script + shadow root + React**: The exact WXT API for `createShadowRootUi` with React needs to be verified against current WXT docs. The `@wxt-dev/module-react` may provide helpers.

2. **`useHotkey` from `@tanstack/react-hotkeys`**: Keyboard events bubble from shadow root to document, so these should work. But need to verify in practice that the hotkey library's event listener setup works correctly when React is mounted inside a shadow root.

3. **`react-text-to-speech` in shadow root**: TTS uses the Web Speech API which should work in any context, but verify.

4. **Shiki JS engine grammar coverage**: Near-perfect but not 100% identical to WASM Oniguruma engine. Verify that common languages (JS, TS, Python, Go, Rust, HTML, CSS, JSON, YAML, bash) highlight correctly.

5. **MobileDrawer move to core**: Vaul + motion dependencies become core deps. Verify this doesn't bloat the core package or cause issues.
