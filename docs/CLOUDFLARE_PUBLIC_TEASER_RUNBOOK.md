# Cloudflare Public Teaser Runbook

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
1. `Mint` stays closed and shows `Soon`
2. `/mint` does not start the CorePass flow
3. bots are discouraged from indexing `/mint` and `/api/`
4. live ownership comes from the public snapshot URL, not from a request-time Vercel function

## Environment

Minimum public teaser environment:

```bash
NEXT_PUBLIC_LAUNCH_STATE=canary
NEXT_PUBLIC_SITE_SURFACE=public-teaser
NEXT_PUBLIC_SITE_BASE_URL=https://replace-with-public-site-origin
NEXT_PUBLIC_CORE_CHAIN_ID=1
CORE_NETWORK_ID=1
CORE_NETWORK_NAME=mainnet
NEXT_PUBLIC_CORE_EXPLORER_BASE_URL=https://blockindex.net
NEXT_PUBLIC_CORECATS_ADDRESS=replace-with-current-public-contract
NEXT_PUBLIC_CORECATS_STATUS_URL=https://replace-with-public-status-origin/api/public/status
```

Notes:
1. `NEXT_PUBLIC_SITE_BASE_URL` keeps public links and robots host-neutral.
2. `NEXT_PUBLIC_CORECATS_STATUS_URL` lets `/collection`, `/cats/[tokenId]`, and `/my-cats` read live ownership state directly from the browser.
3. `CORECATS_BACKEND_SHARED_SECRET` is not required on the public teaser surface because mint routes stay closed there.

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

## Verification Checklist

Before relaunching the public teaser:

1. `Mint` in the header shows `Soon` and is not clickable.
2. `/mint` renders the closed browse-only explanation.
3. `/collection` loads minted status from the public snapshot URL.
4. `/my-cats` can look up ownership through the public snapshot URL.
5. `/robots.txt` disallows `/mint` and `/api/`.
6. `/transparency` shows the correct `Site surface`.
7. `/viewer_v1/collection-index.json` loads from the static teaser origin.

## After Relaunch

Watch:
1. asset transfer volume
2. snapshot URL availability
3. crawler behavior on `/collection` and `/cats/[tokenId]`

If the public teaser stays stable, private canary can resume separately without reopening mint on the community-facing origin.
