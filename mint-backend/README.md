# Core Cats Mint Backend

This service is the first production mint backend target for Core Cats.

It is designed to run on the Contabo Linux server alongside the existing Core full node.

## Responsibilities

1. durable CorePass mint session storage
2. mint authorization issuance through `spark`
3. relayer-assisted `finalizeMint(minter)` through `spark`
4. a small internal HTTP API consumed by the Vercel frontend

The public browser should continue to use the Vercel origin. The Vercel app keeps the UI flow, CorePass callback URL, and QR/app-link generation. This backend only handles durable storage and privileged mint operations.

## API shape

Implemented endpoints:

1. `GET /healthz`
2. `POST /api/mint/authorize`
3. `POST /api/mint/finalize`
4. `GET /api/internal/sessions/:sessionId`
5. `PUT /api/internal/sessions/:sessionId`
6. `DELETE /api/internal/sessions/:sessionId`

All `/api/*` endpoints require:

- `x-corecats-backend-shared-secret: ...`

## Runtime

No framework is required. The service uses:

1. Python standard library HTTP server
2. Python built-in `sqlite3`
3. local `spark` / `foxar`

## Start locally

```bash
cd mint-backend
export CORECATS_BACKEND_SHARED_SECRET=dev-only-secret
python3 -m corecats_mint_backend.server
```

## Expected production placement

1. Contabo Linux host
2. same machine as the Core full node, at least for the first production iteration
3. fronted by a small HTTPS reverse proxy before Vercel calls it
