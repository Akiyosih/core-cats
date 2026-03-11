# Core Cats Mint Backend

This service is the first production mint backend target for Core Cats.

It is designed to run on the Contabo Linux server alongside the existing Core full node.

## Responsibilities

1. durable CorePass mint session storage
2. mint authorization issuance through `spark`
3. relayer-assisted `finalizeMint(minter)` through `spark`
4. a small internal HTTP API consumed by the Vercel frontend
5. backend-side finalize retry / receipt tracking / stuck-session detection

The public browser should continue to use the Vercel origin. The Vercel app keeps the UI flow, CorePass callback URL, and QR/app-link generation. This backend only handles durable storage and privileged mint operations.

## API shape

Implemented endpoints:

1. `GET /healthz`
2. `POST /api/mint/authorize`
3. `POST /api/mint/finalize`
4. `GET /api/internal/sessions/:sessionId`
5. `PUT /api/internal/sessions/:sessionId`
6. `DELETE /api/internal/sessions/:sessionId`
7. `GET /api/public/status`

All `/api/*` endpoints require:

- `x-corecats-backend-shared-secret: ...`

Exception:

- `GET /api/public/status` is intentionally public and read-only so the browser can fetch ownership/minted snapshot data without a Vercel Function hop.

## Runtime

No framework is required. The service uses:

1. Python standard library HTTP server
2. Python built-in `sqlite3`
3. local `spark` / `foxar`
4. a cached explorer-derived ownership snapshot for public collection / ownership pages

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

1. copy the env example to `/etc/corecats-mint-backend.env`
2. fill in the real mainnet values and secrets there
3. install the systemd unit
4. keep the unit file itself free of secret values

For mainnet deployment, prefer `CORE_RPC_URL`.

`CORE_TESTNET_RPC_URL` still works as a legacy alias, but it is semantically the wrong name for the final mainnet service.

The current production shape still expects:

1. `MINT_SIGNER_PRIVATE_KEY` as a raw key
2. `FINALIZER_PRIVATE_KEY` as a raw key, or
3. `FINALIZER_KEYSTORE_PATH` + `FINALIZER_PASSWORD_FILE` as the official Foxar keystore alternative for the dedicated finalizer role
4. when keystore mode is used on Core mainnet, also set `FINALIZER_ADDRESS=<cb...>` so the backend can broadcast with the explicit sender address
5. optional finalize worker tuning:
   - `CORECATS_FINALIZE_WORKER_INTERVAL_SECONDS`
   - `CORECATS_FINALIZE_STUCK_TIMEOUT_SECONDS`

Source reference for the keystore path:
1. https://foxar.dev/reference/cli/spark/script/
2. Core mainnet keystore broadcasts also require `--wallet-network mainnet`:
   - https://foxar.dev/reference/cli/spark/script/

When `CORECATS_BACKEND_PROFILE=production` is set, the backend now fails closed on startup if:

1. it is still pointing at Devin defaults
2. the shared secret is missing
3. `MINT_SIGNER_PRIVATE_KEY` is not explicitly set
4. neither `FINALIZER_PRIVATE_KEY` nor the `FINALIZER_KEYSTORE_PATH` + `FINALIZER_PASSWORD_FILE` pair is explicitly set
5. `spark` or `foxar` paths do not exist

This is intentional. The goal is to prevent a Contabo service from silently starting in a misconfigured Devin-like state.

## Verification

From `mint-backend/`, run:

```bash
python3 -m unittest discover -s tests
```

This covers the production config guardrails and the Contabo preflight checker with repo-local fixtures.

On the Contabo host after `systemctl enable --now corecats-mint-backend`, run:

```bash
bash /root/core-cats/mint-backend/systemd/contabo-mainnet-smoke.sh
```

This smoke check verifies `healthz`, shared-secret auth, and SQLite-backed session CRUD without issuing mint signatures or broadcasting finalize transactions.

In production, `/healthz` also exposes finalize-worker summary fields so stuck-session monitoring can alert on:
1. pending finalize backlog
2. stuck finalize count
3. oldest pending finalize age in seconds

For the public HTTPS frontend, the recommended default is Caddy:

1. reverse-proxy example:
   - `reverse-proxy/Caddyfile.example`
2. public origin check:
   - `bash /root/core-cats/mint-backend/systemd/contabo-public-origin-check.sh https://<backend-origin>`

## Expected production placement

1. Contabo Linux host
2. same machine as the Core full node, at least for the first production iteration
3. fronted by a small HTTPS reverse proxy before Vercel calls it
