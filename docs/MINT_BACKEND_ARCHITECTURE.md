# Core Cats Mint Backend Architecture

## Decision
The production mint path will be split into:

1. **Frontend / public site**
   - host: Vercel
   - origin: the existing public `web/` application
2. **Mint backend**
   - host: Contabo Linux server
   - responsibilities:
     - durable CorePass session persistence
     - nonce / expiry / signature issuance
     - finalize relayer execution
     - `spark` / `foxar` execution
3. **Database**
   - SQLite for the first production iteration

This is the selected path because it preserves the current Core signing/finalization workflow while keeping secrets off Vercel.

Current CorePass scope for this architecture:
1. Protocol-direct mint flow only
   - `corepass:sign`
   - `corepass:tx`
2. No Connector Authorization / KYC-transfer dependency in the current launch target
3. Operational funding assumption for current launch: XCB, not CTN

Reference:
1. `docs/COREPASS_PROTOCOL_AND_CONNECTOR_NOTES.md`

## Why This Split Was Chosen
The current mint implementation is not only a browser-facing Next.js app. It also depends on:

1. `spark` CLI execution
2. `foxar` project files
3. signing/finalizer private keys
4. session state that must survive process restarts

Keeping those concerns on the Contabo Linux server is the shortest path to a safe mainnet launch.

The CorePass session state machine itself stays in the Vercel app, so the current QR / app-link / callback flow can be preserved without reimplementing Core-specific calldata handling in a second runtime.

## Deployment Shape
### Vercel
Vercel remains responsible for:

1. `/`
2. `/about`
3. `/collection`
4. `/cats/[tokenId]`
5. `/transparency`
6. `/mint`
7. `/my-cats`
8. teaser/public state presentation
9. CorePass session state transitions
10. QR / app-link generation
11. callback redirects back to `/mint`

Vercel should not hold production signing keys.

### Contabo backend
Contabo will run the live mint backend:

1. mint authorization issuance
2. finalize relayer actions
3. durable session persistence
4. local RPC usage or the intended Core RPC target
5. internal API for the Vercel app

## Proxy Model
Browser traffic should continue to use the Vercel origin.

The current `web/` app now supports an external backend mode for privileged mint operations and durable session persistence:

1. browser -> `core-cats.vercel.app`
2. Vercel session logic -> Contabo backend
3. Contabo backend -> SQLite / spark / RPC

This preserves one stable public origin for:

1. CorePass callback URLs
2. app-link / QR flow
3. public UX

## Current Switches
The `web/` app supports these backend-related env vars:

1. `CORECATS_BACKEND_MODE`
   - `local`
   - `proxy`
2. `CORECATS_BACKEND_BASE_URL`
   - base URL of the external mint backend when proxy mode is used

Recommended production teaser state:

1. `NEXT_PUBLIC_LAUNCH_STATE=closed`
2. `CORECATS_BACKEND_MODE=local`
3. no mint secrets on Vercel

Recommended mint preparation state:

1. `CORECATS_BACKEND_MODE=proxy`
2. `CORECATS_BACKEND_BASE_URL=https://...`
3. signing/finalizer secrets only on Contabo

## SQLite Scope
SQLite is the chosen first store because:

1. expected write volume is small
2. the backend is initially single-server
3. operational complexity should stay low
4. backups are simple

The first SQLite schema should cover:

1. mint sessions
2. issued authorizations and their status
3. relayer/finalize attempts

## Immediate Next Tasks
1. stage Contabo production secrets:
   - signer material
   - finalizer material
2. expose the backend through HTTPS on Contabo
   - recommended default: Caddy with `mint-backend/reverse-proxy/Caddyfile.example`
3. deploy the Contabo backend with the production env file and systemd unit
4. verify both the local backend and the public HTTPS origin
5. wire Vercel production env to external backend mode for `closed` mainnet publication
6. inject the real mainnet CoreCats contract address into Vercel after deploy
7. promote `closed -> canary -> public` only after the intended mainnet checks succeed
8. keep public browsing on Vercel with no production mint secrets
