# Core Cats Mint Backend

This service was the production mint backend target for Core Cats and now remains as the live ownership/public API service.

It is designed to run on the Contabo Linux server alongside the existing Core full node.

Post-launch state:
1. official `CCAT` public mint is complete
2. the backend's ongoing public role is primarily ownership lookup
3. historical mint session / finalize code remains in the repository for auditability and possible recovery use, but it is no longer the primary public concern

## Responsibilities

1. durable CorePass mint session storage
2. relayer-assisted `finalizeMint(minter)` through `spark`
3. optional legacy mint-authorization issuance for older rehearsal flows
4. public owner lookup endpoints consumed by the browse and mint hosts
5. a small internal HTTP API consumed by the Vercel frontend
6. backend-side finalize retry / receipt tracking / stuck-session detection

The public browser should continue to use the Vercel origin. The Vercel app keeps the UI flow, CorePass callback URL, and QR/app-link generation. This backend only handles durable storage and privileged mint operations.

For a separate `private-canary` rehearsal host, keep the same backend contract/secret pairing and move only the web-side origin values:
1. the canary host should have its own `NEXT_PUBLIC_SITE_BASE_URL`
2. the official public mint host should keep its own production env
3. callback separation is therefore handled on the web side, not by changing the backend API shape

## API shape

Implemented endpoints:

1. `GET /healthz`
2. `POST /api/mint/authorize`
3. `POST /api/mint/finalize`
4. `GET /api/internal/sessions/:sessionId`
5. `PUT /api/internal/sessions/:sessionId`
6. `DELETE /api/internal/sessions/:sessionId`
7. `GET /api/public/owner`
8. `GET /api/public/token-owner`
9. `GET /api/public/status` (retired after sell-out; returns `410`)

All `/api/*` endpoints require:

- `x-corecats-backend-shared-secret: ...`

Public read-only exceptions:

1. `GET /api/public/owner`
2. `GET /api/public/token-owner`
3. `GET /api/public/status` remains public only as a retired endpoint so clients receive an explicit `410 public_status_retired`

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

For local development, the backend keeps the current Devin defaults unless you override them.

## Production / Contabo shape

Use the provided examples:

1. env file:
   - `systemd/corecats-mint-backend.env.example`
2. systemd unit:
   - `systemd/corecats-mint-backend.service.example`

The intended production pattern is:

1. copy the env example to your backend env file, for example `/etc/corecats-mint-backend.env`
2. fill in the real mainnet values and secrets there
3. install the systemd unit
4. keep the unit file itself free of secret values

For mainnet deployment, prefer `CORE_RPC_URL`.

`CORE_TESTNET_RPC_URL` still works as a legacy alias, but it is semantically the wrong name for the final mainnet service.

The intended official production shape expects:

1. no signer key for the normal permissionless mint path
2. `FINALIZER_PRIVATE_KEY` as a raw key, or
3. `FINALIZER_KEYSTORE_PATH` + `FINALIZER_PASSWORD_FILE` as the official Foxar keystore alternative for the dedicated finalizer role
4. when keystore mode is used on Core mainnet, also set `FINALIZER_ADDRESS=<cb...>` so the backend can broadcast with the explicit sender address
5. optional finalize worker tuning:
   - `CORECATS_FINALIZE_WORKER_INTERVAL_SECONDS`
   - `CORECATS_FINALIZE_STUCK_TIMEOUT_SECONDS`

`MINT_SIGNER_PRIVATE_KEY` is now optional and should stay unset for the intended official `CCAT` release.
It only exists for legacy signer-gated rehearsal compatibility.

Source reference for the keystore path:
1. https://foxar.dev/reference/cli/spark/script/
2. Core mainnet keystore broadcasts also require `--wallet-network mainnet`:
   - https://foxar.dev/reference/cli/spark/script/

When `CORECATS_BACKEND_PROFILE=production` is set, the backend now fails closed on startup if:

1. it is still pointing at Devin defaults
2. the shared secret is missing
3. neither `FINALIZER_PRIVATE_KEY` nor the `FINALIZER_KEYSTORE_PATH` + `FINALIZER_PASSWORD_FILE` pair is explicitly set
4. `spark` or `foxar` paths do not exist

This is intentional. The goal is to prevent a Contabo service from silently starting in a misconfigured Devin-like state.

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

Historical mint monitoring note:
in production, `/healthz` also exposes finalize-worker summary fields so stuck-session monitoring can alert on:
1. pending finalize backlog
2. stuck finalize count
3. oldest pending finalize age in seconds

For the public HTTPS frontend, the recommended default is Caddy:

1. reverse-proxy example:
   - `reverse-proxy/Caddyfile.example`
2. public origin check:
   - `bash <repo-root>/mint-backend/systemd/contabo-public-origin-check.sh https://<backend-origin>`

## Expected production placement

1. Contabo Linux host
2. same machine as the Core full node, at least for the first production iteration
3. fronted by a small HTTPS reverse proxy before Vercel calls it
