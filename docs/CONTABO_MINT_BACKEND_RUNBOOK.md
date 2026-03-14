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
3. either `FINALIZER_PRIVATE_KEY`, or:
   - `FINALIZER_ADDRESS`
   - `FINALIZER_KEYSTORE_PATH`
   - `FINALIZER_PASSWORD_FILE`
4. `CORE_RPC_URL` (preferred) or `CORE_TESTNET_RPC_URL` as a legacy alias
5. `CORE_CHAIN_ID`
6. `CORE_NETWORK_ID`
7. `CORE_NETWORK_NAME`
8. `CORE_EXPLORER_BASE_URL`
9. `CORECATS_FOXAR_DIR`
10. `SPARK_PATH`

Optional legacy-only input:

1. `MINT_SIGNER_PRIVATE_KEY`

## Repo-side paths

1. backend code: `mint-backend/`
2. service example: `mint-backend/systemd/corecats-mint-backend.service.example`
3. env example: `mint-backend/systemd/corecats-mint-backend.env.example`
4. preflight checker: `mint-backend/systemd/contabo-mainnet-preflight.sh`
5. post-start smoke checker: `mint-backend/systemd/contabo-mainnet-smoke.sh`
6. Caddy example: `mint-backend/reverse-proxy/Caddyfile.example`
7. public origin checker: `mint-backend/systemd/contabo-public-origin-check.sh`

## Vercel-side inputs for proxy/storage mode

1. `CORECATS_BACKEND_MODE=proxy`
2. `CORECATS_BACKEND_BASE_URL=https://...`
3. `CORECATS_BACKEND_SHARED_SECRET=...`
4. optionally `CORECATS_RELAYER_ENABLED=true`

## Important note

The external backend must be reachable from Vercel through HTTPS.

Using a plain HTTP IP endpoint on the public internet is not acceptable for production mint operations.

## Recommended HTTPS Exposure Method

Recommended default:

1. assign a dedicated backend subdomain such as `mint-backend.<your-domain>`
2. point that DNS record at the Contabo host
3. front the local backend with Caddy on ports `80/443`
4. keep the Python backend bound to `127.0.0.1:8787`

Recommended repo-side example:

1. `mint-backend/reverse-proxy/Caddyfile.example`

Source references:

1. Caddy `reverse_proxy` directive:
   - https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
2. Caddy automatic HTTPS behavior:
   - https://caddyserver.com/docs/caddyfile/options

## Next deployment tasks

1. choose the HTTPS exposure method for Contabo backend
2. copy `core-cats` to Contabo
3. create the required root-owned secret and state directories on the backend host
4. stage the finalizer keystore/password pair on the backend host if keystore mode will be used
5. ensure secret file permissions are `600`
6. copy `mint-backend/systemd/corecats-mint-backend.env.example` to `/etc/corecats-mint-backend.env`
7. fill the env file with the real mainnet values:
   - `CORECATS_BACKEND_PROFILE=production`
   - `CORE_RPC_URL=https://xcbapi-arch-mainnet.coreblockchain.net/`
   - `CORE_CHAIN_ID=1`
   - `CORE_NETWORK_ID=1`
   - `CORE_NETWORK_NAME=mainnet`
   - `CORE_EXPLORER_BASE_URL=https://blockindex.net`
   - `CORECATS_ADDRESS=<real-mainnet-corecats-address>`
   - either `FINALIZER_PRIVATE_KEY=<finalizer-private-key>`
   - or:
     - `FINALIZER_ADDRESS=<wallet4-cb-address>`
     - `FINALIZER_KEYSTORE_PATH=<root-owned-path-to-finalizer-keystore>`
     - `FINALIZER_PASSWORD_FILE=<root-owned-path-to-finalizer-password-file>`
   - only if a legacy signer-gated rehearsal flow must still be supported:
     - `MINT_SIGNER_PRIVATE_KEY=<signer-private-key>`
8. set env-file permission:
   - `chmod 600 /etc/corecats-mint-backend.env`
9. install the systemd unit:
   - `cp /root/core-cats/mint-backend/systemd/corecats-mint-backend.service.example /etc/systemd/system/corecats-mint-backend.service`
   - `systemctl daemon-reload`
10. run preflight before service start:
   - `bash /root/core-cats/mint-backend/systemd/contabo-mainnet-preflight.sh`
11. start backend and verify health:
   - `systemctl enable --now corecats-mint-backend`
   - `journalctl -u corecats-mint-backend -n 100 --no-pager`
   - `curl -sS http://127.0.0.1:8787/healthz`
   - `bash /root/core-cats/mint-backend/systemd/contabo-mainnet-smoke.sh`
12. expose the backend through HTTPS:
   - choose a dedicated backend subdomain and point it at Contabo
   - install Caddy on the Contabo host
   - copy `mint-backend/reverse-proxy/Caddyfile.example` to `/etc/caddy/Caddyfile`
   - replace `mint-backend.example.com` with the real backend subdomain
   - `systemctl reload caddy`
13. verify the public backend origin:
   - `bash /root/core-cats/mint-backend/systemd/contabo-public-origin-check.sh https://<backend-origin>`
14. point Vercel server routes to backend proxy mode
15. test `closed -> canary` before any public mint

## Preflight checker behavior

The checker in `mint-backend/systemd/contabo-mainnet-preflight.sh` fails with non-zero status if:

1. `/etc/corecats-mint-backend.env` or systemd unit is missing
2. env file permission is not `600`
3. mainnet constraints are not met (`network/chain/rpc/explorer`)
4. `CORECATS_BACKEND_SHARED_SECRET` or `CORECATS_ADDRESS` is missing/placeholder
5. finalizer keystore mode is selected but `FINALIZER_ADDRESS` is missing
6. finalizer keystore mode is selected but keystore/password files are missing or not `600`
7. neither finalizer raw key mode nor keystore mode is configured
8. `MINT_SIGNER_PRIVATE_KEY` is present but malformed when legacy signer mode is being used
9. `SPARK_PATH` / `CORECATS_FOXAR_DIR` / DB directory is invalid
10. backend `load_config()` validation fails

This script does not print raw secret values.

## Post-start smoke checker behavior

The checker in `mint-backend/systemd/contabo-mainnet-smoke.sh` verifies:

1. `/healthz` reports `mainnet` and chain id `1`
2. the backend accepts the shared secret from `/etc/corecats-mint-backend.env`
3. internal session `PUT -> GET -> DELETE` works against SQLite

This script does not issue mint signatures or submit on-chain finalize transactions.

## Public origin checker behavior

The checker in `mint-backend/systemd/contabo-public-origin-check.sh` verifies:

1. the backend origin is HTTPS, not plain HTTP
2. `GET /healthz` succeeds through the public reverse proxy
3. the returned values still show `mainnet` and chain id `1`

This script does not require the backend shared secret.

## Startup guard

When the backend is started with `CORECATS_BACKEND_PROFILE=production`, it should fail closed unless:

1. the shared secret is set
2. the RPC / chain / network values are mainnet
3. the CoreCats contract address is no longer the Devin rehearsal address
4. finalizer raw key or finalizer keystore pair is explicitly present
5. `spark` and `foxar` paths are valid on the server

If `MINT_SIGNER_PRIVATE_KEY` is set, it is treated as optional legacy compatibility only and must not be mistaken for an official permissionless-mint requirement.

This is intentional and should be treated as a deployment safety feature, not as a bug.

## Source references

1. mainnet RPC family:
   - https://github.com/core-coin/foxar/blob/master/utils/src/rpc.rs
2. Blockindex mainnet base URL family:
   - https://github.com/core-coin/corebc-rs/blob/master/corebc-core/src/types/network.rs
3. Foxar `spark script` keystore wallet options:
   - https://foxar.dev/reference/cli/spark/script/
4. Core mainnet keystore broadcasts also require `--wallet-network mainnet`:
   - https://foxar.dev/reference/cli/spark/script/
