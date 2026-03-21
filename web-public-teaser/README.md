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

The build writes a static export to `./out`.
It also ships Cloudflare `_headers` rules so teaser images and shared viewer assets are cached aggressively.

## Environment

See `.env.production.example`.

Required build-time values:
1. `NEXT_PUBLIC_SITE_SURFACE=public-teaser`
2. `NEXT_PUBLIC_SITE_BASE_URL`
3. `NEXT_PUBLIC_CORECATS_ADDRESS`
4. `NEXT_PUBLIC_CORECATS_STATUS_URL=/api/public/status`

Required Pages Function binding:
1. `CORECATS_PUBLIC_STATUS_UPSTREAM`

The teaser uses a same-origin Pages Function at `/api/public/status` so browsers do not fetch the ownership
snapshot directly from the upstream Contabo host. The function applies a short edge cache before passing the JSON
through to the client.

## Hosting

Current preferred host:
1. Cloudflare Pages for the public teaser surface
2. separate private canary host for mint rehearsal

Related repository docs:
1. `../README.md` for the overall repository role
2. `../docs/README.md` for the public docs index
3. `../shared/public-site/README.md` for the shared browse-layer boundary

## Cloudflare Deploy Note

Cloudflare Pages is configured with `web-public-teaser` as the root directory.
Shared browse code now lives under `shared/public-site`, so Cloudflare no longer depends on
route files inside `web/` to build the teaser surface.
