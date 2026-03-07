# Core Cats Mint Backend API

This document defines the first external mint backend contract used by the Vercel frontend.

## Principle

The browser should continue to use the Vercel origin.

The external backend does **not** own the public UI flow. It owns:

1. durable session persistence
2. mint authorization issuance
3. relayer-assisted finalize execution

The Vercel app continues to own:

1. CorePass callback URL shape
2. QR / app-link generation
3. session state transitions in application code

## Authentication

All backend `/api/*` endpoints require:

- header: `x-corecats-backend-shared-secret`

This secret is shared only between:

1. Vercel server-side routes
2. Contabo mint backend

Signing keys remain only on Contabo.

## Endpoints

### `GET /healthz`

No auth required.

Response:

```json
{
  "ok": true,
  "networkName": "devin",
  "chainId": 3
}
```

### `POST /api/mint/authorize`

Request:

```json
{
  "minter": "ab...",
  "quantity": 1
}
```

Response:

```json
{
  "minter": "ab...",
  "quantity": 1,
  "nonce": "123",
  "expiry": 1234567890,
  "chainId": 3,
  "messageHash": "0x...",
  "signature": "0x...",
  "coreCatsAddress": "ab...",
  "networkName": "devin",
  "relayerEnabled": true
}
```

### `POST /api/mint/finalize`

Request:

```json
{
  "minter": "ab..."
}
```

Response:

```json
{
  "txHash": "0x...",
  "relayerEnabled": true
}
```

### `GET /api/internal/sessions/:sessionId`

Returns the raw internal session JSON blob used by the Vercel session state machine.

### `PUT /api/internal/sessions/:sessionId`

Stores or replaces the raw internal session JSON blob.

The `sessionId` in the path must match the `id` field in the JSON payload.

### `DELETE /api/internal/sessions/:sessionId`

Deletes the stored session if it exists.

## SQLite schema

The first implementation keeps the schema intentionally small:

1. `mint_sessions`
   - canonical persisted session blob
2. `mint_authorizations`
   - issued signed mint authorizations
3. `finalize_attempts`
   - relayer submission history

This is enough for:

1. durable recovery after Vercel restart
2. operator debugging
3. later audit of authorization/finalize activity
