# Core Cats Vercel Mainnet Cutover Checklist

## Purpose
Define the Vercel-side environment and operator checks needed to move the public site from pre-mainnet teaser mode into the mainnet `closed -> canary -> public` sequence.

## Scope
This document covers the public `web/` application only.

It assumes:
1. the Contabo mint backend is the privileged execution path
2. Vercel remains the stable public origin
3. the site should stay publishable before the mainnet contract address exists

## Inputs Required Before Cutover
1. final public origin for the site
2. Contabo backend origin
3. shared backend secret matching Contabo
4. intended launch state:
   - `closed`
   - `canary`
   - `public`
5. mainnet CoreCats contract address once deploy is complete

Before editing Vercel, also fill the one-page replacement map in:
`docs/OFFICIAL_CCAT_CUTOVER_NOTE.md`

## Source References
1. Mainnet RPC URL family: https://github.com/core-coin/foxar/blob/master/utils/src/rpc.rs
2. Blockindex mainnet base URL family: https://github.com/core-coin/corebc-rs/blob/master/corebc-core/src/types/network.rs
3. Official contract + Vercel replacement map: `docs/OFFICIAL_CCAT_CUTOVER_NOTE.md`

## Recommended Vercel Environment
Use `web/.env.production.example` as the template.

Before copying the values into Vercel, stage them locally and run:

`node ./scripts/check-production-env.mjs ./.env.production.local`

Required values:
1. `NEXT_PUBLIC_LAUNCH_STATE=closed`
2. `NEXT_PUBLIC_CORE_CHAIN_ID=1`
3. `CORE_NETWORK_ID=1`
4. `CORE_NETWORK_NAME=mainnet`
5. `NEXT_PUBLIC_CORE_EXPLORER_BASE_URL=https://blockindex.net`
6. `NEXT_PUBLIC_CORECATS_ADDRESS=replace-with-mainnet-corecats-address`
7. `CORECATS_BACKEND_MODE=proxy`
8. `CORECATS_BACKEND_BASE_URL=https://replace-with-contabo-backend-origin`
9. `CORECATS_BACKEND_SHARED_SECRET=replace-with-the-same-random-secret-as-contabo`
10. `CORECATS_RELAYER_ENABLED=true`

Optional self-only pilot value:
11. `COREPASS_EXPECTED_CORE_ID=replace-with-the-self-only-pilot-wallet-coreid`

Notes:
1. Vercel should not hold deployer or finalizer private keys.
2. Vercel does not need `CORE_RPC_URL` for the intended proxy production path.
3. The site can stay in `closed` even before `NEXT_PUBLIC_CORECATS_ADDRESS` is replaced with the real mainnet address.
4. `COREPASS_EXPECTED_CORE_ID` is only for a closed self-only pilot where the operator intentionally pins identify requests to one known wallet. Do not use it as a public-launch shortcut.

## Closed-State Cutover
Run these steps in order.

1. Keep `NEXT_PUBLIC_LAUNCH_STATE=closed`.
2. Set `CORECATS_BACKEND_MODE=proxy`.
3. Set `CORECATS_BACKEND_BASE_URL` to the HTTPS Contabo backend origin.
   - confirm first that `bash <repo-root>/mint-backend/systemd/contabo-public-origin-check.sh https://<backend-origin>` succeeds on the backend host
4. Set `CORECATS_BACKEND_SHARED_SECRET` to the same random secret used by Contabo.
5. Set `NEXT_PUBLIC_CORE_CHAIN_ID=1`, `CORE_NETWORK_ID=1`, and `CORE_NETWORK_NAME=mainnet`.
6. Set `NEXT_PUBLIC_CORE_EXPLORER_BASE_URL=https://blockindex.net`.
7. Redeploy Vercel.
8. Confirm:
   - `/mint` renders as `closed`
   - `/transparency` shows `Mainnet deployment pending` until the real contract address is supplied
   - the public site is still reachable on the intended origin
   - any callback/app-link redirect built by the app resolves to the intended public origin, not `localhost` or an internal host

Optional terminal-side probe after redeploy:

`node ./scripts/probe-public-origin.mjs https://<public-origin> --expected-chain-id 1 --expected-network mainnet --expected-contract <cb...>`

## Post-Deploy Address Injection
After the mainnet `CoreCats` contract exists:

1. Replace `NEXT_PUBLIC_CORECATS_ADDRESS` with the real mainnet `cb...` contract address.
2. Redeploy Vercel.
3. Confirm:
   - `/transparency` shows the real mainnet contract link
   - the explorer link targets `https://blockindex.net/address/<contract>`
   - no public page still points at Devin for the contract surface

## Canary Switch
Move to `canary` only after the Contabo backend and contract address are both correct.

1. Change `NEXT_PUBLIC_LAUNCH_STATE=canary`.
2. Redeploy Vercel.
3. Confirm:
   - `/mint` shows the canary banner
   - mint session creation works from the production origin
   - proxy traffic reaches the Contabo backend successfully
   - QR 1 callback returns to the same public origin and prepares QR 2
   - callback redirects never resolve to `localhost` or another internal host
   - if any edge restriction is added in front of the host, `/api/mint/corepass/callback/*` remains reachable by CorePass without browser-only auth prompts

One valid use of this stage is the `CCATTEST rehearsal canary`:
1. keep `NEXT_PUBLIC_CORECATS_ADDRESS` pointed at the mainnet `CCATTEST` contract
2. keep `COREPASS_EXPECTED_CORE_ID` unset
3. use the real public `/mint` UI rather than a hidden operator path under `closed`
4. still run a later official `CCAT` canary after the final contract is deployed

If a self-only pilot must still keep the public page visually `closed`, the terminal-side session probe can drive the CorePass session API without exposing the mint UI:

`node ./scripts/probe-public-origin.mjs https://<public-origin> --expected-chain-id 1 --expected-network mainnet --expected-contract <pilot-cb...> --expect-relayer true --watch`

## Public Switch
Move to `public` only after at least one successful canary mint.

1. Change `NEXT_PUBLIC_LAUNCH_STATE=public`.
2. Redeploy Vercel.
3. Set a spend cap before exposing the public-mint host.
4. Confirm:
   - `/mint` shows the public-live banner
   - relayer status shown to users matches actual backend behavior
   - transparency and explorer links still point at mainnet
   - QR 1 and QR 2 callback/app-link returns stay on the final public mint origin
   - callback redirects never point to `localhost` or another internal host

## Mint UX Readiness Checks
Before treating a Vercel deployment as release-ready, confirm:

1. any self-only `COREPASS_EXPECTED_CORE_ID` value has been removed unless the deployment is explicitly a self-only pilot
2. the visible quantity choices match the quantities that have actually been canaried
3. the site either supports both QR entry paths or clearly discloses any limitation:
   - device standard camera -> CorePass launch
   - CorePass in-app QR scanner
4. the mint UI distinguishes:
   - commit confirmed / finalize pending
   - mint completed after finalize
5. the finalize-waiting copy tells users:
   - automatic finalize usually completes within a few minutes
   - do not start a new mint or reuse any earlier QR within `30` minutes
   - if the NFT still has not arrived after `30` minutes, start a new mint from the beginning
6. the success state offers:
   - transaction/explorer links
   - a clear contract address or contract explorer surface
   - a next step to `My Cats`
7. the public UI does not require a visible manual-finalize or third-QR recovery path

## Exact-Host Official Smoke
Before opening the general mint on Vercel Pro, run one official `CCAT` smoke mint on that exact public-mint origin.

1. use the deployed official `CCAT` contract, not `CCATTEST`
2. prove on the final public-mint host:
   - `QR 1`
   - `QR 2`
   - callback return on the same public origin
   - Step `3`
   - finalize success
   - `My Cats`
   - transparency and explorer links
3. if same-device mobile is later disclosed at all, treat it as a secondary path until that exact final host has also proven it

## Rollback Levers
If something is wrong on the public site:

1. change `NEXT_PUBLIC_LAUNCH_STATE` back to `closed`
2. redeploy Vercel
3. if needed, disable Contabo exposure separately without changing the public origin
