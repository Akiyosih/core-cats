# Private Canary Deploy Runbook

Purpose:
1. reopen the mint rehearsal on a private operator-controlled origin
2. keep the community-facing teaser site browse-only
3. make the canary host easy to retire once the public mint surface is ready

Reference URLs:
1. Core Blockchain project surface: https://coreblockchain.net/
2. Foxar toolchain intro: https://foxar.dev/intro/
3. Cloudflare Pages static teaser runbook: `docs/CLOUDFLARE_PUBLIC_TEASER_RUNBOOK.md`

## Target Surface

Use the main `web/` app with:

1. `NEXT_PUBLIC_LAUNCH_STATE=canary`
2. `NEXT_PUBLIC_SITE_SURFACE=private-canary`
3. proxy backend mode enabled

This surface is for operator-led validation only.

## Environment

Start from:

`web/.env.private-canary.example`

Minimum required values:

```bash
NEXT_PUBLIC_LAUNCH_STATE=canary
NEXT_PUBLIC_SITE_SURFACE=private-canary
NEXT_PUBLIC_SITE_BASE_URL=https://replace-with-private-canary-origin
NEXT_PUBLIC_CORE_CHAIN_ID=1
CORE_NETWORK_ID=1
CORE_NETWORK_NAME=mainnet
NEXT_PUBLIC_CORE_EXPLORER_BASE_URL=https://blockindex.net
NEXT_PUBLIC_CORECATS_ADDRESS=cb3022bb9ee4752d778f4c63b47559e77b4ca06a122a
CORECATS_BACKEND_MODE=proxy
CORECATS_BACKEND_BASE_URL=https://replace-with-private-canary-backend-origin
CORECATS_BACKEND_SHARED_SECRET=replace-with-the-same-random-secret-as-the-backend
CORECATS_RELAYER_ENABLED=true
```

Notes:
1. the private canary host should not reuse the public teaser origin
2. the backend origin may be the existing Contabo proxy if it is already the live mint backend
3. `NEXT_PUBLIC_CORECATS_STATUS_URL` is optional on the private canary host, but keeping it set is useful for `/collection` and `/my-cats`

## Recommended Access Policy

Recommended default:
1. separate hostname from the public teaser
2. Basic Auth or equivalent edge restriction
3. no public navigation link from the teaser site
4. `X-Robots-Tag` / `robots` should keep the host out of search indexing

The app now emits `noindex` metadata and `robots.txt` rules when `NEXT_PUBLIC_SITE_SURFACE=private-canary`.

## Build / Verification

From `core-cats/web`:

```bash
npm install
node --test ./scripts/check-production-env.test.mjs
npm run build
```

Before deployment:
1. stage the target env in a local file
2. run `node ./scripts/check-production-env.mjs ./.env.production.local`
3. confirm the output resolves to `private-canary`

## Canary-Specific Checks

After deployment:
1. `/` shows the private rehearsal notice
2. `/mint` is live and can create a session
3. `/robots.txt` disallows all indexing
4. page source contains `noindex`
5. callback URLs use the private canary origin, not the public teaser origin
6. `/transparency` shows `Site surface: private-canary`

## Exit Condition

This host is temporary.

Once:
1. browse/static hardening is complete
2. the final public mint origin has been revalidated
3. the launch state is ready to advance to `public`

the community-facing site can reopen mint and this private canary host can be retired.
