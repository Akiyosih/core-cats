# Official CCAT Cutover Note

Status: historical cutover note from the official `CCAT` deploy window

## Purpose
Provide the one-page replacement map for moving from the completed `CCATTEST rehearsal canary` into the official `CCAT` deploy and the later Vercel Pro exact-host smoke.

Architecture note:
1. `docs/OFFICIAL_CCAT_LAUNCH_PRINCIPLES.md` is the authoritative public philosophy target for the official release
2. this cutover note assumes the official `CCAT` contract is permissionless and retains no owner/admin path after deploy

Use this together with:
1. `docs/MAINNET_CLOSED_LAUNCH_RUNBOOK.md`
2. `docs/VERCEL_MAINNET_CUTOVER_CHECKLIST.md`
3. `docs/MAINNET_PUBLIC_EVIDENCE_CHECKLIST.md`

## Current Operator Order
As of `2026-03-14`, the intended next sequence is:

1. keep the finalized no-logo superrare inputs fixed:
   - `manifests/superrare_beam_selection.json`
   - `manifests/beam_token_reorder.json`
2. run the official `CCAT` deploy dry-run:
   - source `foxar/.env.mainnet-official.example`
   - add the live RPC / keystore / password inputs in the local shell
   - run `spark script script/CoreCatsDeploy.s.sol:CoreCatsDeployScript ...` without `--broadcast`
3. if the dry-run is clean, proceed to:
   - the real official `CCAT` deploy
   - the Vercel Pro `closed` cutover with the official contract address
   - publication of the minimum public evidence set in `docs/MAINNET_PUBLIC_EVIDENCE_CHECKLIST.md`
   - the later exact-host official smoke mint before opening the public mint

## Source References
1. Mainnet RPC URL family: https://github.com/core-coin/foxar/blob/master/utils/src/rpc.rs
2. Blockindex mainnet base URL family: https://github.com/core-coin/corebc-rs/blob/master/corebc-core/src/types/network.rs

## Replacement Map
Replace only the contract-specific and launch-specific surfaces. Keep the already-proven mint flow unless an official-host regression appears.

| Surface | Rehearsal (`CCATTEST`) | Official (`CCAT`) |
| --- | --- | --- |
| Main contract address | current mainnet `CCATTEST` address | replace with deployed official `CCAT` address |
| First public launch state | private canary `canary` | public origin `closed` first |
| Public mint host | private canary origin | final Vercel Pro public-mint origin |
| Callback origin | rehearsal origin | exact final Vercel Pro public-mint origin |
| Explorer base | `https://blockindex.net` | unchanged |
| Backend mode | `proxy` | unchanged |
| Backend execution path | Contabo mint backend with session/finalize duties | unchanged unless intentionally rotated |
| Mint eligibility control | signer-gated rehearsal path | permissionless on-chain rule only |
| Finalizer direction | relayer / finalize worker on Contabo | unchanged unless intentionally rotated |
| Transparency contract surface | `CCATTEST` contract/explorer links | replace with official `CCAT` contract/explorer links |
| Launch copy | rehearsal/canary wording allowed | remove `CCATTEST` and any canary-only wording from public-facing copy |
| Same-device disclosure | secondary supported path | keep secondary until exact final host also proves it |

## What Carries Forward Unchanged
Treat these as already proven by the rehearsal unless an official-host regression appears:

1. quantity `1 / 2 / 3`
2. desktop-first primary mint path
3. same-device mobile as a secondary path
4. relayer-driven finalize
5. `My Cats` ownership lookup
6. transparency/explorer behavior
7. callback path shape and session recovery model
8. over-limit refusal before a gas-spending commit transaction is prepared
9. finalize waiting copy and `30`-minute retry guidance

## Official Deploy Dry-Run Inputs
Stage the official deploy inputs locally before any broadcast.

Source the non-secret defaults from:
`foxar/.env.mainnet-official.example`

Expected official values:
1. `CORECATS_COLLECTION_NAME=CoreCats`
2. `CORECATS_SYMBOL=CCAT`
3. `CORECATS_TOKEN_NAME_PREFIX=CoreCats`
4. `CORECATS_TOKEN_DESCRIPTION="CoreCats is a 1,000-piece fully on-chain 24x24 SVG cat collection on Core Blockchain, built from public code and fixed manifests."`
5. `CORECATS_ALLOW_NONSTANDARD_LABELS=0`
6. `CORECATS_SUPERRARE_PLACEHOLDER=0`

The official `CORECATS_TOKEN_DESCRIPTION` wording is now fixed in the repo defaults above and should be used unchanged for the official deploy unless the project intentionally reopens that decision.

Keep these secrets or live values outside the repository:
1. mainnet RPC URL
2. deployer keystore path
3. deployer password file
4. final deployer address

## Super-Rare Decision Gate
The current official path is already fixed to the no-logo beam superrare set.

Before the official deploy, confirm only this:
1. `manifests/superrare_beam_selection.json` is the intended canonical 10-token source list
2. `manifests/beam_token_reorder.json` is the intended final token reorder map
3. `CORECATS_SUPERRARE_PLACEHOLDER=0` remains unchanged for the official deploy

## Official Deploy Dry-Run Commands
Stage the official env locally:

```bash
set -a
source foxar/.env.mainnet-official.example
set +a
```

Add the live operator-only values in your local shell:

```bash
export CORE_MAINNET_RPC_URL="<mainnet-rpc>"
export DEPLOYER_ADDRESS="<cb...>"
export DEPLOYER_KEYSTORE_PATH="<keystore-path>"
export DEPLOYER_PASSWORD_FILE="<password-file>"
```

Run the deploy script as a dry-run first by omitting `--broadcast`:

```bash
spark script script/CoreCatsDeploy.s.sol:CoreCatsDeployScript \
  --fork-url "$CORE_MAINNET_RPC_URL" \
  --network-id 1 \
  --wallet-network mainnet \
  --keystore "$DEPLOYER_KEYSTORE_PATH" \
  --password-file "$DEPLOYER_PASSWORD_FILE"
```

Dry-run acceptance:
1. the script resolves the official labels without requiring `CORECATS_ALLOW_NONSTANDARD_LABELS=1`
2. placeholder mode stays off
3. no constructor-arg or script-shape issue appears before the real broadcast window

After the real deploy, fill:
1. `CORECATS_ADDRESS`
2. `EXPECTED_RENDERER_ADDRESS`

Then run the existing post-deploy check:

```bash
spark script script/CoreCatsPostDeployCheck.s.sol:CoreCatsPostDeployCheckScript \
  --fork-url "$CORE_MAINNET_RPC_URL" \
  --network-id 1
```

## Vercel Pro Cutover Defaults
For the first official public-origin deploy, keep the site in `closed`.

Required values:
1. `NEXT_PUBLIC_LAUNCH_STATE=closed`
2. `NEXT_PUBLIC_SITE_BASE_URL=https://<final-public-origin>`
3. `NEXT_PUBLIC_CORE_CHAIN_ID=1`
4. `CORE_NETWORK_ID=1`
5. `CORE_NETWORK_NAME=mainnet`
6. `NEXT_PUBLIC_CORE_EXPLORER_BASE_URL=https://blockindex.net`
7. `NEXT_PUBLIC_CORECATS_ADDRESS=<official-ccat-address>`
8. `CORECATS_BACKEND_MODE=proxy`
9. `CORECATS_BACKEND_BASE_URL=https://<contabo-backend-origin>`
10. `CORECATS_BACKEND_SHARED_SECRET=<same-secret-as-contabo>`
11. `CORECATS_RELAYER_ENABLED=true`
12. `COREPASS_EXPECTED_CORE_ID` unset

Before switching to `canary`, confirm:
1. no public page still points at the rehearsal contract
2. callback redirects resolve to the final public origin, not `localhost` or an internal host
3. the public UI no longer carries rehearsal-only labels

## Exact-Host Official Smoke Scope
The official canary still has to prove the host- and contract-specific pieces that rehearsal could not prove:

1. official `CCAT` contract address wiring
2. final Vercel Pro env replacement accuracy
3. proof that the deployed contract actually matches the no-owner / no-signer official philosophy from published source and verification evidence
4. one full mint on that exact final public origin:
   - `QR 1`
   - `QR 2`
   - callback return on the same origin
   - Step `3`
   - finalize success
   - `My Cats`
   - transparency and explorer links
