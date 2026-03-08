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
4. either `FINALIZER_PRIVATE_KEY`, or:
   - `FINALIZER_KEYSTORE_PATH`
   - `FINALIZER_PASSWORD_FILE`
5. `CORE_RPC_URL` (preferred) or `CORE_TESTNET_RPC_URL` as a legacy alias
6. `CORE_CHAIN_ID`
7. `CORE_NETWORK_ID`
8. `CORE_NETWORK_NAME`
9. `CORE_EXPLORER_BASE_URL`
10. `CORECATS_FOXAR_DIR`
11. `SPARK_PATH`

## Repo-side paths

1. backend code: `mint-backend/`
2. service example: `mint-backend/systemd/corecats-mint-backend.service.example`
3. env example: `mint-backend/systemd/corecats-mint-backend.env.example`

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
3. copy `mint-backend/systemd/corecats-mint-backend.env.example` to `/etc/corecats-mint-backend.env`
4. fill the env file with the real mainnet values:
   - `CORECATS_BACKEND_PROFILE=production`
   - `CORE_RPC_URL=https://xcbapi-arch-mainnet.coreblockchain.net/`
   - `CORE_CHAIN_ID=1`
   - `CORE_NETWORK_ID=1`
   - `CORE_NETWORK_NAME=mainnet`
   - `CORE_EXPLORER_BASE_URL=https://blockindex.net`
   - `CORECATS_ADDRESS=<real-mainnet-corecats-address>`
   - `MINT_SIGNER_PRIVATE_KEY=<wallet3-private-key>`
   - either `FINALIZER_PRIVATE_KEY=<wallet4-private-key>`
   - or:
     - `FINALIZER_KEYSTORE_PATH=<wallet4-utc-file>`
     - `FINALIZER_PASSWORD_FILE=<wallet4-password-file>`
5. install the systemd unit
6. start backend locally on Contabo
7. confirm `GET /healthz` reports mainnet values, not devin values
8. point Vercel server routes to backend proxy mode
9. test `closed -> canary` before any public mint

## Startup guard

When the backend is started with `CORECATS_BACKEND_PROFILE=production`, it should fail closed unless:

1. the shared secret is set
2. the RPC / chain / network values are mainnet
3. the CoreCats contract address is no longer the Devin rehearsal address
4. signer key is explicitly present
5. finalizer raw key or finalizer keystore pair is explicitly present
6. `spark` and `foxar` paths are valid on the server

This is intentional and should be treated as a deployment safety feature, not as a bug.

## Source references

1. mainnet RPC family:
   - https://github.com/core-coin/foxar/blob/master/utils/src/rpc.rs
2. Blockindex mainnet base URL family:
   - https://github.com/core-coin/corebc-rs/blob/master/corebc-core/src/types/network.rs
3. Foxar `spark script` keystore wallet options:
   - https://foxar.dev/reference/cli/spark/script/
