# Core Cats Web

Next.js frontend foundation for the Core Cats public web UI.

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
6. `/mint` (CorePass QR / app-link flow)
7. `/my-cats` (wallet ownership lookup)

## Data Source

The web app reads repository viewer data generated from:

`../manifests/viewer_v1/`

If the collection viewer data needs regeneration, run from the repository root:

```bash
node scripts/ui/generate_viewer_data.mjs
```

Then generate raster previews from `core-cats/web`:

```bash
npm run build:viewer-previews
```

This pipeline now writes:
1. lightweight viewer metadata to `../manifests/viewer_v1/collection.json`
2. static preview SVGs to `./public/viewer_v1/svg/`
3. static preview PNGs to `./public/viewer_v1/png/`

The collection and homepage use the static PNG previews for browsing speed, while the detail page keeps the renderer-derived SVG.

## Mint Environment

The mint routes use:
1. CorePass protocol URIs for wallet-facing `sign` / `tx` requests
2. local server-side execution of `spark` scripts to preserve the current Core signing path
3. an in-memory session store for CorePass callback state during local/testnet iteration

The `web/` app can also be switched into proxy mode so that these mint routes forward to an external Linux backend.

Server runtime looks for values in this order:
1. `web` process environment
2. `../foxar/.env`

Important variables:
1. `CORE_RPC_URL` (preferred when local backend mode is used)
2. `CORE_TESTNET_RPC_URL` (legacy alias still passed through to `spark`)
3. `DEPLOYER_PRIVATE_KEY`
4. `MINT_SIGNER_PRIVATE_KEY` (optional, defaults to deployer key)
5. `FINALIZER_PRIVATE_KEY` (optional, defaults to deployer key)
6. `NEXT_PUBLIC_CORECATS_ADDRESS` (optional, defaults to the latest Devin rehearsal address)
7. `COREPASS_SESSION_TTL_SECONDS` (optional, defaults to 1200)
8. `CORECATS_BACKEND_MODE` (`local` or `proxy`)
9. `CORECATS_BACKEND_BASE_URL` (required when `CORECATS_BACKEND_MODE=proxy`)
10. `CORECATS_BACKEND_SHARED_SECRET` (required when `CORECATS_BACKEND_MODE=proxy`)

When `CORECATS_BACKEND_BASE_URL` points at the public HTTPS backend origin, the frontend also derives a public ownership snapshot URL from:

`<CORECATS_BACKEND_BASE_URL>/api/public/status`

This lets `/collection`, `/my-cats`, and the public mint counter read live ownership state from the browser without using a Vercel Function on every page view.

## Current Mint Flow

1. Create a CorePass mint session on `/mint`
2. CorePass signs a random challenge to bind a concrete `coreID`
3. CorePass sends the `commitMint(...)` transaction
4. the server tries relayer-assisted `finalizeMint(minter)`
5. the desktop page keeps a lightweight status view and directs users to wait or retry from the beginning if finalize never completes

## Production Note

The current CorePass session store is in-memory. That is acceptable for local development and testnet rehearsal, but it is not the final production storage design.

The current production direction is:
1. Vercel for the public website
2. Contabo Linux for the mint backend
3. SQLite for the first durable session store

The Vercel app keeps:
1. QR / app-link generation
2. CorePass callback redirects
3. session state transitions

The external mint backend owns:
1. durable session persistence
2. nonce / expiry / signature issuance
3. finalize relayer execution
4. `spark` / `foxar` execution
5. the public ownership snapshot consumed directly by collection / ownership pages

See `../docs/MINT_BACKEND_ARCHITECTURE.md`.
Use `./.env.production.example` and `../docs/VERCEL_MAINNET_CUTOVER_CHECKLIST.md` for the Vercel-side mainnet switch.

Before copying the final values into Vercel, stage them in a local file such as `.env.production.local` and run:

```bash
node ./scripts/check-production-env.mjs ./.env.production.local
```

This catches obvious mainnet cutover mistakes such as:
1. Devin fallback addresses
2. non-HTTPS backend origin
3. placeholder shared secret values
4. accidental private key placement in the Vercel env

## Current Local Validation Limit

In the active local user environment, the available CorePass app exposes only a mainnet `cb...` account and does not expose a Devin testnet `ab...` account. That means:
1. the CorePass-first `/mint` implementation is now the intended production-target UX
2. live CorePass E2E on Devin is still blocked by wallet availability
3. Core Devin contract and relayer validation should continue separately until a testnet-capable CorePass path exists
