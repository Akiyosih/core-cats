# Core Cats Public Browse Surface

Static-exported browse-first surface for Cloudflare Pages or another static host.

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
1. `NEXT_PUBLIC_LAUNCH_STATE=public`
2. `NEXT_PUBLIC_SITE_SURFACE=public-teaser`
3. `NEXT_PUBLIC_SITE_BASE_URL`
4. `NEXT_PUBLIC_CORECATS_ADDRESS`
5. `NEXT_PUBLIC_CORECATS_PUBLIC_API_BASE_URL=/api/public`

Required Pages Function binding:
1. `CORECATS_PUBLIC_API_UPSTREAM`

The teaser uses same-origin Pages Functions at:
1. `/api/public/owner`
2. `/api/public/token-owner`

so browsers do not fetch ownership data directly from the upstream backend host. Those functions apply a short edge
cache before passing the JSON through to the client.

Post-launch note:
1. `GET /api/public/status` is retired after sell-out and returns `410`
2. ownership UI should use the owner/token-owner endpoints instead
3. the legacy env name `NEXT_PUBLIC_CORECATS_STATUS_URL` is still accepted, but the canonical post-launch setting is `NEXT_PUBLIC_CORECATS_PUBLIC_API_BASE_URL`

## Hosting

Current preferred host:
1. Cloudflare Pages for the public teaser surface
2. separate mint host for sold-out references, ownership checks, and historical mint verification pages

Related repository docs:
1. `../README.md` for the overall repository role
2. `../docs/README.md` for the public docs index
3. `../shared/public-site/README.md` for the shared browse-layer boundary

## Cloudflare Deploy Note

Cloudflare Pages is configured with `web-public-teaser` as the root directory.
Shared browse code now lives under `shared/public-site`, so Cloudflare no longer depends on
route files inside `web/` to build the teaser surface.
