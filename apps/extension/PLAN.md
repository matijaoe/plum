# Plum Chrome Extension — Implementation Plan

## Overview

Build a WXT-based Chrome extension that reuses `@plum/core` to render articles in reader mode directly on the current page. The extension reads the page's DOM (no CORS proxy needed), parses it with `extractArticleFromDom`, and replaces the page content with Plum's reader view inside a shadow root.

## Official Documentation References

Read these before executing:

- **WXT** (framework): https://wxt.dev/
- **WXT content scripts**: https://wxt.dev/guide/essentials/content-scripts.html
- **WXT content script UI (shadow root)**: https://wxt.dev/guide/key-concepts/content-script-ui.html
- **WXT + Vite config**: https://wxt.dev/guide/essentials/config/vite
- **WXT manifest config**: https://wxt.dev/guide/essentials/config/manifest
- **WXT monorepo tsconfig**: https://wxt.dev/guide/essentials/config/typescript
- **Dominik Weber's monorepo writeup**: https://weberdominik.com/blog/monorepo-wxt-nextjs/
- **Tailwind v4 content detection**: https://tailwindcss.com/docs/detecting-classes-in-source-files

---

## Architecture

### How it works

1. User clicks the extension's browser action icon (or uses a keyboard shortcut)
2. A content script activates on the current tab
3. The content script grabs `document.cloneNode(true)` and calls `extractArticleFromDom(doc, location.href)` from `@plum/core`
4. If parsing succeeds, the script creates a shadow root UI (`createShadowRootUi`) and renders the reader view inside it — replacing the visible page content
5. The reader view uses the same shared components as the web app: `ArticleView`, `TableOfContents`, `TtsControls`, `ScrollToTop`, `ThemeToggle`
6. An "Open in Plum" link opens the web app with `?url=` for the full experience
7. Pressing Escape or clicking a close button exits reader mode and restores the original page

### Why shadow root

- CSS isolation: Plum's Tailwind styles don't leak into the host page, and the host page's styles don't break the reader view
- `createShadowRootUi` from WXT handles this automatically
- `cssInjectionMode: 'ui'` injects the bundled CSS into the shadow root

### What comes from `@plum/core`

- `extractArticleFromDom(doc, sourceUrl)` — parses the live page DOM into an `Article`
- `ArticleView`, `TableOfContents`, `TtsControls`, `ScrollToTop`, `ThemeToggle` — shared UI
- `useDoubleEscape`, `useIsMobile`, `navigateToFragment` — shared hooks
- `@plum/core/styles.css` — shared theme, prose styles, animations

### What is extension-specific

- `wxt.config.ts` — WXT configuration, manifest, Vite plugins, aliases
- `entrypoints/background.ts` — listens for browser action click, injects content script
- `entrypoints/content.tsx` — content script that parses page and renders reader view
- `entrypoints/popup.html` + `popup.tsx` — (optional) small popup with "Read this page" button
- Extension-specific wrapper component (`ReaderOverlay.tsx`) that composes the shared components and handles enter/exit reader mode
- Tailwind CSS entry point with `source()` base path for monorepo content detection

---

## Target Structure

```
apps/extension/
├── entrypoints/
│   ├── background.ts          # Browser action listener
│   ├── content.tsx             # Content script — parses page, renders reader
│   └── content.css             # Tailwind entry for content script
├── components/
│   └── reader-overlay.tsx      # Extension-specific composition root
├── public/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── package.json
├── wxt.config.ts
├── tsconfig.json
└── PLAN.md                     # This file (delete after implementation)
```

---

## Execution Steps

### Phase 1: Scaffold WXT project

1. Run `npx wxt@latest init` inside `apps/extension/` with the React template, or manually create the files following WXT's project structure. Do NOT use `vp dlx` — WXT is not a Vite+ tool.
2. Clean up any generated boilerplate that conflicts with the monorepo setup (duplicate `.gitignore`, etc.).
3. Update `apps/extension/package.json`:
   - Add `"@plum/core": "workspace:*"` as a dependency
   - Add shared dependencies that the extension uses directly (React, React DOM, etc.)
   - Ensure scripts use `wxt` commands (`dev`, `build`, `zip`)
   - Add `"postinstall": "wxt prepare"` script
4. Run `vp install` from the monorepo root to link workspace dependencies.

### Phase 2: Configure WXT for the monorepo

1. Set up `wxt.config.ts`:
   - Configure `alias` to resolve `@plum/core` source files (WXT requires aliases in its own config, not just tsconfig)
   - Add `@tailwindcss/vite` to the Vite plugins
   - Add React plugin (`@vitejs/plugin-react`) to Vite plugins
   - Configure the manifest: name, description, permissions (`activeTab`, `scripting`), icons, action
2. Set up `tsconfig.json`:
   - Use WXT's recommended monorepo approach: standalone tsconfig with `/// <reference path="./.wxt/wxt.d.ts" />`
   - Target ES2023, DOM libs, bundler module resolution, JSX react-jsx
   - Strict mode enabled
3. Run `wxt prepare` to generate `.wxt/` types directory.

### Phase 3: Create the Tailwind CSS entry

1. Create `entrypoints/content.css`:
   ```css
   @import "tailwindcss" source("../../..");
   @plugin "@tailwindcss/typography";
   @import "@plum/core/styles.css";
   ```
   Same pattern as the web app — `source()` points to the monorepo root for content detection.
2. Import this CSS in the content script entry point.

### Phase 4: Implement the content script

1. Create `entrypoints/content.tsx`:
   - Define the content script with `defineContentScript`
   - `matches: ['<all_urls>']` (activated programmatically, not on every page)
   - `cssInjectionMode: 'ui'` for shadow root CSS injection
   - In `main(ctx)`: use `createShadowRootUi` to mount React into a shadow root
   - Parse the page: `extractArticleFromDom(document.cloneNode(true), location.href)`
   - If parsing fails, show a toast/notification and bail out
   - If parsing succeeds, render `ReaderOverlay` with the parsed article
   - The shadow root should cover the full viewport (`position: fixed; inset: 0; z-index: 2147483647`)

2. Create `components/reader-overlay.tsx`:
   - Accepts the parsed `Article` and `sourceUrl`
   - Renders the same layout as the web app's article view:
     - `ThemeToggle` (top right)
     - `TableOfContents` (left sidebar on desktop)
     - `ArticleView` (center prose column)
     - `TtsControls` (bottom left on desktop)
     - `ScrollToTop` (bottom right)
   - Adds extension-specific controls:
     - Close/exit button (X) to exit reader mode
     - "Open in Plum" link that opens `{PLUM_WEB_URL}?url={currentUrl}` in a new tab
   - Escape key exits reader mode (single press, since there's no "clear" concept)
   - Wraps everything in `ThemeProvider` from `next-themes`

### Phase 5: Implement the background script

1. Create `entrypoints/background.ts`:
   - Listen for `browser.action.onClicked` — when the user clicks the extension icon
   - Execute the content script on the active tab using `browser.scripting.executeScript` (or let WXT handle registration)
   - Alternatively, if WXT's content script registration handles activation, the background script may just toggle a message to the content script

### Phase 6: Icons and manifest

1. Generate extension icons from the existing `favicon.svg`:
   - 16x16, 48x48, 128x128 PNGs in `public/`
   - WXT auto-discovers icons matching `icon-{size}.png` in `public/`
2. Configure manifest in `wxt.config.ts`:
   ```ts
   manifest: {
     name: 'Plum Reader',
     description: 'Distraction-free reader mode for any page',
     permissions: ['activeTab', 'scripting'],
     action: {},
   }
   ```

### Phase 7: Verify

1. Run `wxt dev` from `apps/extension/` — this opens Chrome with the extension loaded
2. Navigate to any article page and click the extension icon
3. Verify:
   - Article parses and renders in reader mode
   - Typography, theme, code highlighting all work correctly
   - TTS controls work
   - Table of contents works
   - Image lightbox works
   - Theme toggle works (light/dark/system)
   - Escape exits reader mode and restores the original page
   - "Open in Plum" opens the web app with the correct URL
4. Run `wxt build` to verify production build works
5. Run `wxt zip` to generate the distributable `.zip`

---

## Key Considerations

### Shadow root gotchas

- **`rem` units**: Inside a shadow root, `rem` is relative to the main document's root font size, not the shadow root. This should be fine since Plum's CSS uses the document root.
- **Portals**: React portals render outside the shadow root and lose styles. If `yet-another-react-lightbox` uses portals, it may need a custom container target within the shadow root.
- **Fonts**: Google Fonts loaded via `<link>` in the original page won't apply inside the shadow root. The content script needs to inject the font `<link>` into the shadow root or the document head.

### What is NOT in scope

- Firefox support (WXT supports it, but focus on Chrome first)
- Extension popup UI (may not be needed — browser action click directly activates reader mode)
- Options page
- Syncing preferences between extension and web app
- Publishing to the Chrome Web Store
