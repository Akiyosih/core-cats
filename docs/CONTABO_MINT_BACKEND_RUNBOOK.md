# Contabo Mint Backend Runbook

This runbook covers the first production-style mint backend deployment target for Core Cats.

## Target shape

1. Core full node stays on Contabo
2. mint backend also runs on Contabo
3. Vercel stays the public web frontend
4. Vercel server-side routes call the backend through a shared-secret protected HTTPS endpoint

## Runtime choice

The first backend implementation is:

1. Python standard library HTTP service
2. SQLite
3. local `spark` / `foxar`

This avoids introducing extra framework/runtime complexity before mainnet canary.

## Required server-side inputs

1. `CORECATS_BACKEND_SHARED_SECRET`
2. `CORECATS_ADDRESS`
3. `MINT_SIGNER_PRIVATE_KEY`
4. `FINALIZER_PRIVATE_KEY`
5. `CORE_TESTNET_RPC_URL` or the intended Core RPC URL
6. `CORE_CHAIN_ID`
7. `CORE_NETWORK_ID`
8. `CORE_NETWORK_NAME`
9. `CORE_EXPLORER_BASE_URL`
10. `CORECATS_FOXAR_DIR`
11. `SPARK_PATH`

## Repo-side paths

1. backend code: `mint-backend/`
2. service example: `mint-backend/systemd/corecats-mint-backend.service.example`

## Vercel-side inputs for proxy/storage mode

1. `CORECATS_BACKEND_MODE=proxy`
2. `CORECATS_BACKEND_BASE_URL=https://...`
3. `CORECATS_BACKEND_SHARED_SECRET=...`
4. optionally `CORECATS_RELAYER_ENABLED=true`

## Important note

The external backend must be reachable from Vercel through HTTPS.

Using a plain HTTP IP endpoint on the public internet is not acceptable for production mint operations.

## Next deployment tasks

1. choose the HTTPS exposure method for Contabo backend
2. copy `core-cats` to Contabo
3. create the systemd unit
4. start backend locally on Contabo
5. point Vercel server routes to backend proxy mode
6. test `closed -> canary` before any public mint
