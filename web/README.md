# Core Cats Web

Next.js frontend foundation for the Core Cats public web UI.

## Commands

From `core-cats/web`:

```bash
npm install
npm run dev
npm run build
```

## Current Scope

Implemented routes:
1. `/`
2. `/about`
3. `/collection`
4. `/cats/[tokenId]`
5. `/transparency`
6. `/mint` (CorePass QR / app-link flow)
7. `/my-cats` (status placeholder)

## Data Source

The web app reads repository viewer data generated from:

`../manifests/viewer_v1/`

If the collection viewer data needs regeneration, run from the repository root:

```bash
node scripts/ui/generate_viewer_data.mjs
```

## Mint Environment

The mint routes use:
1. CorePass protocol URIs for wallet-facing `sign` / `tx` requests
2. local server-side execution of `spark` scripts to preserve the current Core signing path
3. an in-memory session store for CorePass callback state during local/testnet iteration

Server runtime looks for values in this order:
1. `web` process environment
2. `../foxar/.env`

Important variables:
1. `CORE_TESTNET_RPC_URL`
2. `DEPLOYER_PRIVATE_KEY`
3. `MINT_SIGNER_PRIVATE_KEY` (optional, defaults to deployer key)
4. `FINALIZER_PRIVATE_KEY` (optional, defaults to deployer key)
5. `NEXT_PUBLIC_CORECATS_ADDRESS` (optional, defaults to the latest Devin rehearsal address)
6. `COREPASS_SESSION_TTL_SECONDS` (optional, defaults to 1200)

## Current Mint Flow

1. Create a CorePass mint session on `/mint`
2. CorePass signs a random challenge to bind a concrete `coreID`
3. CorePass sends the `commitMint(...)` transaction
4. the server tries relayer-assisted `finalizeMint(minter)`
5. if relayer finalize is unavailable, the page exposes a CorePass `finalizeMint(minter)` fallback request

## Production Note

The current CorePass session store is in-memory. That is acceptable for local development and testnet rehearsal, but it is not the final production storage design.

## Current Local Validation Limit

In the active local user environment, the available CorePass app exposes only a mainnet `cb...` account and does not expose a Devin testnet `ab...` account. That means:
1. the CorePass-first `/mint` implementation is now the intended production-target UX
2. live CorePass E2E on Devin is still blocked by wallet availability
3. Core Devin contract and relayer validation should continue separately until a testnet-capable CorePass path exists
