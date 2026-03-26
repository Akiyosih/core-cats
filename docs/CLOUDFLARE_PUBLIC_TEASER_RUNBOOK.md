# Cloudflare Public Teaser Runbook

Status note:
1. public mint is complete
2. this document remains as the public browse-host deployment runbook
3. launch-era `Mint Soon` language below should be interpreted as historical context unless intentionally reenabling a closed browse surface

Purpose:
- relaunch the community-facing teaser and browse surface on a low-cost static-first host
- keep mint rehearsal on a separate private canary surface
- avoid exposing live CorePass session creation on the public teaser origin

Reference URLs:
- Cloudflare Pages overview: https://developers.cloudflare.com/pages/
- Cloudflare Pages pricing: https://developers.cloudflare.com/pages/functions/pricing/
- Cloudflare Next.js static export guidance: https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/
- Next.js public folder cache behavior: https://nextjs.org/docs/pages/api-reference/file-conventions/public-folder
- Next.js static export: https://nextjs.org/docs/app/guides/static-exports

## Target Surface

Use the `public-teaser` surface for the community-facing site.

Deploy the separate static teaser app rooted at:

`core-cats/web-public-teaser`

Expected public routes:
1. `/`
2. `/about`
3. `/collection`
4. `/cats/[tokenId]`
5. `/transparency`
6. `/my-cats`

Public teaser behavior:
1. `/mint` is not deployed on the public teaser origin
2. bots are discouraged from indexing `/mint` and `/api/`
3. live ownership comes from a same-origin Cloudflare Pages Function, not from a request-time Vercel function

## Environment

Minimum public teaser environment:

```bash
NEXT_PUBLIC_LAUNCH_STATE=public
NEXT_PUBLIC_SITE_SURFACE=public-teaser
NEXT_PUBLIC_SITE_BASE_URL=https://replace-with-public-site-origin
NEXT_PUBLIC_CORE_CHAIN_ID=1
CORE_NETWORK_ID=1
CORE_NETWORK_NAME=mainnet
NEXT_PUBLIC_CORE_EXPLORER_BASE_URL=https://blockindex.net
NEXT_PUBLIC_CORECATS_ADDRESS=replace-with-current-public-contract
NEXT_PUBLIC_CORECATS_PUBLIC_API_BASE_URL=/api/public
CORECATS_PUBLIC_API_UPSTREAM=https://replace-with-public-api-origin/api/public
```

Notes:
1. `NEXT_PUBLIC_SITE_BASE_URL` keeps public links and robots host-neutral.
2. `NEXT_PUBLIC_CORECATS_PUBLIC_API_BASE_URL=/api/public` keeps browser reads same-origin on the public teaser host.
3. `CORECATS_PUBLIC_API_UPSTREAM` points the Cloudflare Pages Functions at the current public backend API origin.
4. `CORECATS_BACKEND_SHARED_SECRET` is not required on the public teaser surface because mint routes stay closed there.

Cloudflare Pages build settings:
1. Framework preset: `Next.js (Static HTML Export)`
2. Root directory: `web-public-teaser`
3. Build command: `npm run build`
4. Build output directory: `out`
5. Node.js version: leave the default unless a future Cloudflare runtime change requires pinning

## Public / Private Split

Operate two separate deployments from the same repository:

1. `public-teaser`
   - community-facing
   - browse-only
   - no public link into canary mint

2. `private-canary`
   - operator-facing rehearsal surface
   - mint routes enabled
   - optional Basic Auth or equivalent edge restriction

The final public mint can later reopen on the community-facing origin by switching the public site to `public-mint`.

## Cloudflare Dashboard Flow

Current UI labels can vary, but the flow should be:

1. open `Developer Platform`
2. choose `Start building`
3. select `Pages`
4. choose `Connect to Git`
5. authorize GitHub if prompted
6. select the `core-cats` repository
7. enter the build settings listed above
8. add the public teaser environment values
9. deploy without a custom domain first

The static teaser app also includes a `_headers` file in `web-public-teaser/public/_headers` so Cloudflare Pages can
cache `viewer` art assets, the white-background avatar PNGs, and the teaser images aggressively after each deploy.
It also includes Pages Functions at:
1. `web-public-teaser/functions/api/public/status.js`
2. `web-public-teaser/functions/api/public/owner.js`
3. `web-public-teaser/functions/api/public/token-owner.js`

The global status route is retired after sell-out and now returns `410 public_status_retired`. Active ownership reads
should use the owner and token-owner routes so the browser stays same-origin on the teaser host instead of hitting the
upstream backend directly.

## Verification Checklist

Before relaunching or auditing the public teaser:

1. `/mint` returns the teaser-origin not-found response instead of opening CorePass session flow.
2. `/api/public/status` returns `410 public_status_retired` on the public teaser origin.
3. `/api/public/owner?address=<known-owner>` returns JSON on the public teaser origin.
4. `/api/public/token-owner?tokenId=<known-token>` returns JSON on the public teaser origin.
5. `/my-cats` can look up ownership through the same-origin owner route.
6. cat detail pages expose both transparent and white-background avatar PNG links.
7. `/robots.txt` disallows `/mint` and `/api/`.
8. `/transparency` shows the correct `Site surface`.
9. `/viewer/collection-index.json` loads from the static teaser origin.
10. image responses under `/viewer/png/`, `/viewer/png-white/`, and `/viewer/svg/` return long-lived cache headers.

## After Relaunch

Watch:
1. asset transfer volume
2. same-origin snapshot route availability
3. crawler behavior on `/collection` and `/cats/[tokenId]`

If the public teaser stays stable, private canary can resume separately without reopening mint on the community-facing origin.
