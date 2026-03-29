# Plum

Reader mode app + chrome extension. Load any article URL and get a clean, distraction-free view.

Big plans ahead 🙂

Built with React, Tailwind CSS v4, Mozilla Readability, and DOMPurify.

## Setup

```sh
vp install
cp .env.example .env
vp dev
```

Edit `.env` to point `VITE_PROXY_URL` at your own CORS proxy if needed.

## CORS Proxy

Articles are fetched through a Cloudflare Worker proxy (`proxy/` directory) because browsers block cross-origin requests to article sites.

To deploy your own:

```sh
cd proxy
pnpm install
npx wrangler login
npx wrangler deploy
```

Update `VITE_PROXY_URL` in your `.env` with the deployed URL.
