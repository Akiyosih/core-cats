# Core Cats Mint Backend

This service was the production mint backend target for Core Cats and now remains as the live ownership/public API service.

It is designed to run on the Contabo Linux server alongside the existing Core full node.

Post-launch state:
1. official `CCAT` public mint is complete
2. the backend's ongoing public role is primarily ownership lookup
3. the preferred production posture is `CORECATS_BACKEND_MODE=read-only`
4. historical mint session / finalize code remains in the repository for auditability and recovery review, but it is no longer the primary public concern

## Responsibilities

1. durable CorePass mint session storage
2. relayer-assisted `finalizeMint(minter)` through `spark`
3. optional legacy mint-authorization issuance for older rehearsal flows
4. public owner lookup endpoints consumed by the browse and mint hosts
5. a small internal HTTP API consumed by the Vercel frontend
6. backend-side finalize retry / receipt tracking / stuck-session detection

In the current post-mint steady state, items `1`, `2`, `3`, and `6` are historical/operator concerns. The active public role is the owner lookup surface.

The public browser uses the Vercel origin. The Vercel app owns the UI flow, CorePass callback URL, and QR/app-link generation. This backend handles durable storage and privileged mint operations.

For the historical `private-canary` rehearsal host, the backend contract/secret pairing stayed fixed while only the web-side origin values changed:
1. the canary host had its own `NEXT_PUBLIC_SITE_BASE_URL`
2. the official public mint host kept its own production env
3. callback separation is therefore handled on the web side, not by changing the backend API shape

## API shape

Implemented endpoints:

1. `GET /healthz`
2. `GET /api/public/mint-count`
3. `POST /api/mint/precheck`
4. `POST /api/mint/authorize`
5. `POST /api/mint/finalize`
6. `GET /api/internal/sessions/:sessionId`
7. `PUT /api/internal/sessions/:sessionId`
8. `DELETE /api/internal/sessions/:sessionId`
9. `GET /api/public/owner`
10. `GET /api/public/token-owner`
11. `GET /api/public/status` (retired after sell-out; returns `410`)

All `/api/*` endpoints require:

- `x-corecats-backend-shared-secret: ...`

Public read-only exceptions:

1. `GET /api/public/owner`
2. `GET /api/public/token-owner`
3. `GET /api/public/mint-count`
4. `GET /api/public/status` remains public only as a retired endpoint so clients receive an explicit `410 public_status_retired`

When `CORECATS_BACKEND_MODE=read-only`, the mint write endpoints and internal session CRUD routes stay mounted only to return an explicit retired response. They are no longer part of the active production flow.

## Runtime

No framework is required. The service uses:

1. Python standard library HTTP server
2. Python built-in `sqlite3`
3. local `spark` / `foxar`
4. cached owner/token-owner reads for public collection / ownership pages

## Start locally

```bash
cd mint-backend
export CORECATS_BACKEND_SHARED_SECRET=dev-only-secret
python3 -m corecats_mint_backend.server
```

Without explicit overrides, local development uses the current Devin defaults.

## Production / Contabo shape

Use the provided examples:

1. env file:
   - `systemd/corecats-mint-backend.env.example`
2. systemd unit:
   - `systemd/corecats-mint-backend.service.example`

Production pattern:

1. copy the env example to your backend env file, for example `/etc/corecats-mint-backend.env`
2. fill in the real mainnet values and secrets there
3. install the systemd unit
4. keep the unit file itself free of secret values

Current recommended production mode:

1. set `CORECATS_BACKEND_MODE=read-only`
2. keep the public owner APIs live
3. omit finalizer / signer secrets from the long-running service env

For mainnet deployment, prefer `CORE_RPC_URL`.

`CORE_TESTNET_RPC_URL` still works as a legacy alias, but it is semantically the wrong name for the final mainnet service.

Mainnet runtime shape:

1. `CORECATS_BACKEND_MODE=read-only` for the current post-mint service shape, or
2. `CORECATS_BACKEND_MODE=mint-active` only when intentionally reviving historical mint write behavior
3. no signer key for the normal permissionless mint path
4. `FINALIZER_PRIVATE_KEY` as a raw key, or
5. `FINALIZER_KEYSTORE_PATH` + `FINALIZER_PASSWORD_FILE` as the official Foxar keystore alternative for the dedicated finalizer role
6. when keystore mode is used on Core mainnet, also set `FINALIZER_ADDRESS=<cb...>` so the backend can broadcast with the explicit sender address
7. optional finalize worker tuning:
   - `CORECATS_FINALIZE_WORKER_INTERVAL_SECONDS`
   - `CORECATS_FINALIZE_STUCK_TIMEOUT_SECONDS`

`MINT_SIGNER_PRIVATE_KEY` is optional and remains unset for the official `CCAT` release.
It only exists for legacy signer-gated rehearsal compatibility.

Source reference for the keystore path:
1. https://foxar.dev/reference/cli/spark/script/
2. Core mainnet keystore broadcasts also require `--wallet-network mainnet`:
   - https://foxar.dev/reference/cli/spark/script/

When `CORECATS_BACKEND_PROFILE=production` is set, the backend now fails closed on startup if:

1. it is still pointing at Devin defaults
2. the shared secret is missing
3. it is in `mint-active` mode and neither `FINALIZER_PRIVATE_KEY` nor the `FINALIZER_KEYSTORE_PATH` + `FINALIZER_PASSWORD_FILE` pair is explicitly set
4. it is in `mint-active` mode and `spark` or `foxar` paths do not exist

This prevents a Contabo service from silently starting in a misconfigured Devin-like state.

## Verification

From `mint-backend/`, run:

```bash
python3 -m unittest discover -s tests
```

This covers the production config guardrails and the Contabo preflight checker with repo-local fixtures.

On the backend host after `systemctl enable --now corecats-mint-backend`, run:

```bash
bash <repo-root>/mint-backend/systemd/contabo-mainnet-smoke.sh
```

This smoke check verifies `healthz`, shared-secret auth, and SQLite-backed session CRUD without issuing mint signatures or broadcasting finalize transactions.

In `read-only` mode the same smoke entrypoint checks:
1. `healthz`
2. `public/mint-count`
3. `public/token-owner`

Historical mint monitoring note:
in production, `/healthz` also exposes finalize-worker summary fields so stuck-session monitoring can alert on:
1. pending finalize backlog
2. stuck finalize count
3. oldest pending finalize age in seconds

A Caddy reverse-proxy example is provided:

1. reverse-proxy example:
   - `reverse-proxy/Caddyfile.example`
2. public origin check:
   - `bash <repo-root>/mint-backend/systemd/contabo-public-origin-check.sh https://<backend-origin>`

## Expected production placement

1. Contabo Linux host
2. same machine as the Core full node, at least for the first production iteration
3. fronted by a small HTTPS reverse proxy before Vercel calls it
