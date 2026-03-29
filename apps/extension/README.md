# Plum Browser Extension

This directory will contain a WXT-based Chrome/Firefox extension for Plum.

## Status

**Not yet initialized.** This is a placeholder — the extension will be scaffolded separately.

## Setup (future)

Initialize using the WXT CLI with the React template:

```sh
npx wxt@latest init
```

## Architecture

- Depends on `@plum/core` (`"@plum/core": "workspace:*"`) for shared reader logic and UI components
- Uses content scripts to replace the page DOM with the reader view
- Reads the page DOM directly via `extractArticleFromDom` — no CORS proxy needed
- TTS controls rendered in-page alongside the article view
- "Open in Plum" button links to the web app with `?url=` parameter

## References

- WXT docs: https://wxt.dev/
- WXT monorepo tsconfig: https://wxt.dev/guide/essentials/config/typescript
- Dominik Weber's monorepo writeup: https://weberdominik.com/blog/monorepo-wxt-nextjs/
