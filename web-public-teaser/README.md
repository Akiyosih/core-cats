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

## Cloudflare Deploy Note

Cloudflare Pages is configured with `web-public-teaser` as the root directory.
If a public teaser change only touches shared files under `../web`, Cloudflare can show
`No deployment available` for that commit because nothing changed inside the configured root.

When a shared browse/UI change needs to reach Cloudflare production, make sure the commit also
contains a change under `web-public-teaser/` so Pages creates a new deployment.
