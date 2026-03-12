# Core Cats Public Teaser

Static-exported browse-only surface for Cloudflare Pages or another static host.

Routes included:
1. `/`
2. `/about`
3. `/collection`
4. `/cats/[tokenId]`
5. `/transparency`
6. `/my-cats`

Routes intentionally excluded:
1. `/mint`
2. `/api/*`

## Commands

From `core-cats/web-public-teaser`:

```bash
npm install
npm run build
```

The build script syncs shared viewer assets from `../web/public` and writes a static export to `./out`.
It also ships Cloudflare `_headers` rules so the teaser images and shared viewer assets are cached aggressively.

## Environment

See `.env.production.example`.

Required public values:
1. `NEXT_PUBLIC_SITE_SURFACE=public-teaser`
2. `NEXT_PUBLIC_SITE_BASE_URL`
3. `NEXT_PUBLIC_CORECATS_ADDRESS`
4. `NEXT_PUBLIC_CORECATS_STATUS_URL`

## Hosting

Current preferred host:
1. Cloudflare Pages for the public teaser surface
2. separate private canary host for mint rehearsal
