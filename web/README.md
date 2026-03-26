# Core Cats Web

Next.js application for the sold-out mint host, ownership lookup, and historical CorePass mint surface.

## Commands

From `core-cats/web`:

```bash
npm install
npm run dev
npm run build
npm run build:viewer-previews
```

## Current Scope

Implemented routes:
1. `/`
2. `/about`
3. `/collection`
4. `/cats/[tokenId]`
5. `/transparency`
6. `/mint` (sold-out / verification host; historical CorePass flow code remains in this workspace)
7. `/my-cats` (wallet ownership lookup)

## Data Source

The web app reads repository viewer data generated from:

`../manifests/viewer/`

If the collection viewer data needs regeneration, run from the repository root:

```bash
node scripts/ui/generate_viewer_data.mjs
```

Then generate raster previews from `core-cats/web`:

```bash
npm run build:viewer-previews
```

This pipeline now writes:
1. lightweight viewer metadata to `../manifests/viewer/collection.json`
2. static preview SVGs to `./public/viewer/svg/`
3. static preview PNGs to `./public/viewer/png/`

The collection and homepage use the static PNG previews for browsing speed, while the detail page keeps the renderer-derived SVG.

## Post-Launch Public API

Active ownership reads use:
1. `/api/public/owner?address=...`
2. `/api/public/token-owner?tokenId=...`

Canonical env names:
1. `NEXT_PUBLIC_CORECATS_PUBLIC_API_BASE_URL`
2. `CORECATS_PUBLIC_API_BASE_URL`

Legacy compatibility:
1. `NEXT_PUBLIC_CORECATS_STATUS_URL` is still accepted and normalized to the same `/api/public` base
2. `GET /api/public/status` is retired after sell-out and is not part of the active public data surface

## Mint Environment

The historical mint routes use:
1. CorePass protocol URIs for wallet-facing `sign` / `login` / `tx` requests
2. local server-side execution of `spark` scripts for the Core signing path
3. an in-memory session store for CorePass callback state during local/testnet iteration

The app can also run in proxy mode so these routes forward to an external Linux backend.

Server runtime looks for values in this order:
1. `web` process environment
2. `../foxar/.env`

Important variables:
1. `CORE_RPC_URL` (preferred when local backend mode is used)
2. `CORE_TESTNET_RPC_URL` (legacy alias still passed through to `spark`)
3. `DEPLOYER_PRIVATE_KEY`
4. `FINALIZER_PRIVATE_KEY` (optional, defaults to deployer key)
5. `NEXT_PUBLIC_CORECATS_ADDRESS` (optional, defaults to the latest Devin rehearsal address)
6. `NEXT_PUBLIC_SITE_SURFACE` (`public-teaser`, `private-canary`, or `public-mint`)
7. `NEXT_PUBLIC_SITE_BASE_URL` (required when the mint surface is enabled; used for callback URLs, robots, canonical links, and host portability)
8. `NEXT_PUBLIC_CORECATS_MINT_ONLY_HOST` / `CORECATS_MINT_ONLY_HOST` (`1` or `true` when this deployment should serve mint only)
9. `NEXT_PUBLIC_CORECATS_BROWSE_BASE_URL` / `CORECATS_BROWSE_BASE_URL` (required when mint-only host mode is enabled)
10. `COREPASS_SESSION_TTL_SECONDS` (optional, defaults to 1200)
11. `CORECATS_BACKEND_MODE` (`local` or `proxy`)
12. `CORECATS_BACKEND_BASE_URL` (required when the mint surface is enabled and `CORECATS_BACKEND_MODE=proxy`)
13. `CORECATS_BACKEND_SHARED_SECRET` (required when the mint surface is enabled and `CORECATS_BACKEND_MODE=proxy`)
14. `CORECATS_INTERNAL_BACKEND_BASE_URL` (optional loopback backend origin for a self-hosted private canary)
15. `NEXT_PUBLIC_PRIVATE_CANARY_BADGE_TEXT`, `NEXT_PUBLIC_PRIVATE_CANARY_TITLE_TEXT`, `NEXT_PUBLIC_PRIVATE_CANARY_WARNING_TEXT` (optional UI-only labels for a private canary host)
16. `NEXT_PUBLIC_CORECATS_RENDERER_ADDRESS` and `NEXT_PUBLIC_CORECATS_DATA_ADDRESS` (optional but recommended; used by `/transparency` so mint hosts can publish the renderer/data surface alongside the CoreCats contract)
17. `NEXT_PUBLIC_PRIVATE_CANARY_ENFORCE_CANONICAL_HOST` / `CORECATS_PRIVATE_CANARY_ENFORCE_CANONICAL_HOST` (optional page-only redirect to the stable private canary alias; API and callback routes stay untouched)
18. `COREPASS_IDENTIFY_METHOD` (optional; `sign` by default, `login` for the QR1 comparison experiment while keeping QR2 and finalize unchanged)
19. `COREPASS_IDENTIFY_USE_SIGNATURE_RECOVERY` (optional private-canary experiment; if `1` and `COREPASS_IDENTIFY_METHOD=sign`, the server prefers the QR1 signature-recovered signer over the callback `coreID` and stores both values for diagnosis)

When `CORECATS_BACKEND_BASE_URL` points at the public HTTPS backend origin, the frontend derives ownership routes from:

1. `<CORECATS_BACKEND_BASE_URL>/api/public/owner?address=...`
2. `<CORECATS_BACKEND_BASE_URL>/api/public/token-owner?tokenId=...`

For the Cloudflare browse host, same-origin routes under `/api/public/*` proxy to the upstream public API origin through host-side binding or equivalent runtime env.

Useful env templates:
1. `./.env.production.example`
2. `./.env.private-canary.example`

## Deployment Surfaces

This workspace supports three public-facing modes:

1. `public-teaser`
   Browse-only community site.
2. `private-canary`
   Historical / recovery rehearsal surface.
3. `public-mint`
   Mint-oriented host mode used during launch and retained after sell-out as a support / verification surface.

In the post-launch production layout:
1. use `web-public-teaser/` as the preferred static browse-only app for the community-facing teaser origin
2. use `web/` for the mint/support host
3. feed live ownership from the public owner/token-owner API
4. keep any historical canary host separate from the community-facing browse origin

For mainnet, `public-mint` acts as a mint-support surface rather than a full browse host:
1. keep the full browse site on Cloudflare
2. point the browse-site mint CTA at the Vercel mint host
3. set `NEXT_PUBLIC_CORECATS_MINT_ONLY_HOST=1`
4. set `NEXT_PUBLIC_CORECATS_BROWSE_BASE_URL=https://<cloudflare-browse-origin>`
5. let `/` serve the mint entry while non-mint browse routes on the Vercel host hand off to the browse origin

The historical private-canary path used the same split:
1. keep the official public mint host reserved for `public-mint`
2. give `private-canary` its own stable canary-only alias
3. set `NEXT_PUBLIC_SITE_BASE_URL` to that canary alias, not to the official host and not to a raw preview deployment URL
4. if the canary host is mint-only, also set `NEXT_PUBLIC_CORECATS_MINT_ONLY_HOST=1`
5. optionally set `NEXT_PUBLIC_PRIVATE_CANARY_ENFORCE_CANONICAL_HOST=1` so page traffic is pushed onto that stable alias while `/api/mint/corepass/callback/*` stays reachable

## Historical Mint Flow

1. Create a CorePass mint session on `/mint`
2. QR 1 binds a concrete `coreID` using either a CorePass sign request or login request, depending on `COREPASS_IDENTIFY_METHOD`
3. the server checks wallet state and remaining unreserved supply before `QR 2 of 2` is prepared
4. CorePass sends the `commitMint(...)` transaction
5. the server tries relayer-assisted `finalizeMint(minter)`
6. the desktop page keeps a lightweight status view and directs users to wait or retry from the beginning if finalize never completes

## Production Note

The CorePass session store in `web/` is not the durable production authority. Post-launch, ownership lookup and
historical mint evidence remain relevant here, while durable mint session storage lives on the external backend.

The production shape used for the launch was:
1. Vercel for the public website
2. Contabo Linux for the mint backend
3. SQLite for the first durable session store

The Vercel app keeps:
1. QR / app-link generation
2. CorePass callback redirects
3. session state transitions

Host-sensitive callback note:
1. callback URLs and callback redirects must always resolve to the external site origin users opened
2. explicit `NEXT_PUBLIC_SITE_BASE_URL` takes precedence over implicit reverse-proxy host detection
3. any temporary edge auth layer must leave `/api/mint/corepass/callback/*` reachable from CorePass without browser-only auth prompts

The external mint backend owns:
1. durable session persistence
2. finalize relayer execution
3. optional legacy authorization issuance for older rehearsal tooling only; the official path is permissionless and does not rely on signer or allowlist gating
4. `spark` / `foxar` execution
5. the public ownership API consumed by collection / ownership pages

See `../docs/MINT_BACKEND_ARCHITECTURE.md`.
Use `./.env.production.example` and `../docs/VERCEL_MAINNET_CUTOVER_CHECKLIST.md` as historical reference for the mainnet mint host shape.
Use `./.env.private-canary.example` and `../docs/PRIVATE_CANARY_DEPLOY_RUNBOOK.md` only when reviewing the historical or recovery canary path.

Before copying the final values into Vercel, stage them in a local file such as `.env.production.local` and run:

```bash
node ./scripts/check-production-env.mjs ./.env.production.local
```

This catches obvious mainnet cutover mistakes such as:
1. Devin fallback addresses
2. non-HTTPS backend origin
3. placeholder shared secret values
4. accidental private key placement in the Vercel env
