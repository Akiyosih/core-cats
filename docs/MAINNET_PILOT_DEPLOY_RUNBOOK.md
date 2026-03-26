# Core Cats Mainnet Pilot Deploy Runbook

Status: Operator runbook for the optional self-only `CCATTEST` fallback

## Purpose
Provide the exact deploy and first-validation sequence for the optional self-only mainnet pilot contract.

This runbook is for the fallback path documented in `docs/MAINNET_PILOT_FALLBACK.md`.

It is not the official `CCAT` release runbook.

## Preconditions
1. The project has explicitly chosen the optional pilot fallback.
2. The pilot remains self-only and clearly non-official.
3. The active contract workspace is `core-cats/foxar`.
4. A dedicated deployer account is available on the Foxar keystore path for deploy transactions.
5. If the full web/backend/CorePass path will be tested, the backend/finalizer material is already staged on the backend host.

## Pilot Labels
Use these values unless there is a specific reason to change them:

```bash
export CORECATS_COLLECTION_NAME=CCATTEST
export CORECATS_SYMBOL=CCATTEST
export CORECATS_ALLOW_NONSTANDARD_LABELS=1
export CORECATS_TOKEN_NAME_PREFIX=CCATTEST
export CORECATS_TOKEN_DESCRIPTION="CCATTEST pilot for self-only CorePass mainnet validation. Non-official release."
export CORECATS_SUPERRARE_PLACEHOLDER=0
```

These preserve mint/security/randomness/supply while making the pilot visibly non-official.
The explicit `CORECATS_ALLOW_NONSTANDARD_LABELS=1` opt-in is required so the mainnet deploy script cannot accidentally reuse pilot labels during the official `CoreCats / CCAT` deploy.

## Required Inputs
1. Mainnet RPC URL:
   - `CORE_MAINNET_RPC_URL`
2. Deployer keystore path:
   - `DEPLOYER_KEYSTORE_PATH`
3. Deployer password file:
   - `DEPLOYER_PASSWORD_FILE`
4. Deployer address for recordkeeping:
   - `DEPLOYER_ADDRESS`
5. Optional script-only mint path inputs:
   - `MINT_TO`
   - `MINTER_ADDRESS`
   - `MINT_SECRET` or `MINT_SEED`

## Recommended Session Setup
From `core-cats/foxar`, load the non-secret pilot labels first:

```bash
set -a
source ./.env.mainnet-pilot.example
set +a
```

Then export the local deploy inputs:

```bash
export CORE_MAINNET_RPC_URL="<mainnet-rpc-url>"
export DEPLOYER_KEYSTORE_PATH="<local-path-to-deployer-keystore>"
export DEPLOYER_PASSWORD_FILE="<local-path-to-deployer-password-file>"
export DEPLOYER_ADDRESS="<deployer-address>"
```

`DEPLOYER_ADDRESS` must match the keystore-resolved deployer address when using `--keystore` / `--password-file`.
Otherwise Foxar will fall back to its default broadcast sender instead of the intended deployer.

For Core mainnet keystore broadcasts, also pass `--wallet-network mainnet` so the keystore-derived sender address uses the mainnet `cb...` form accepted by the RPC.

Before any simulation or broadcast, record:

```bash
git rev-parse --short HEAD
git status --short --branch
```

Expected:
1. `HEAD` matches the intended deploy commit.
2. the working tree is clean.

## Build and Test Gate
From `core-cats/foxar`:

```bash
spark build
spark test
```

Expected: tests pass before any mainnet simulation or broadcast.

## Dry Run (No Broadcast)
Run the pilot deploy script once without `--broadcast`.

```bash
spark script script/CoreCatsDeploy.s.sol:CoreCatsDeployScript \
  --fork-url "$CORE_MAINNET_RPC_URL" \
  --network-id 1 \
  --wallet-network mainnet \
  --keystore "$DEPLOYER_KEYSTORE_PATH" \
  --password-file "$DEPLOYER_PASSWORD_FILE"
```

Expected: the script simulation succeeds with the pilot labels.

Record at minimum:
1. git commit SHA
2. deployer address
3. the exact pilot label values loaded from env
4. whether the dry run completed without revert

## Broadcast Deploy
Run the real pilot deploy:

```bash
spark script script/CoreCatsDeploy.s.sol:CoreCatsDeployScript \
  --fork-url "$CORE_MAINNET_RPC_URL" \
  --network-id 1 \
  --wallet-network mainnet \
  --keystore "$DEPLOYER_KEYSTORE_PATH" \
  --password-file "$DEPLOYER_PASSWORD_FILE" \
  --broadcast
```

Record the deployed addresses:
1. `CoreCatsOnchainData`
2. `CoreCatsMetadataRenderer`
3. `CoreCats`

Also record:
1. deploy tx hashes
2. git commit SHA
3. deployer address
4. the exact pilot label values used

## Post-Deploy Check
Immediately confirm the deployed state:

```bash
export CORECATS_ADDRESS="<pilot-corecats-address>"
export EXPECTED_RENDERER_ADDRESS="<pilot-renderer-address>"
export EXPECTED_COLLECTION_NAME=CCATTEST
export EXPECTED_COLLECTION_SYMBOL=CCATTEST

spark script script/CoreCatsPostDeployCheck.s.sol:CoreCatsPostDeployCheckScript \
  --fork-url "$CORE_MAINNET_RPC_URL" \
  --network-id 1
```

Expected:
1. renderer matches
2. collection name/symbol are `CCATTEST`
3. total supply is `0`
4. available supply is `1000`
5. reserved supply is `0`

## Preferred Validation Path: Backend + Closed Site
Use this when the goal is to validate the real Contabo/Vercel/CorePass path on mainnet.

1. Insert the pilot `CORECATS_ADDRESS` into the staged Contabo env.
2. Run preflight against the staged env first:

```bash
ENV_FILE=<staged-backend-env-file> \
bash <repo-root>/mint-backend/systemd/contabo-mainnet-preflight.sh
```

3. Promote the candidate env to active, restart the backend, and run:
   - `ENV_FILE=<active-backend-env-file> bash <repo-root>/mint-backend/systemd/contabo-mainnet-smoke.sh`
   - `bash <repo-root>/mint-backend/systemd/contabo-public-origin-check.sh https://<backend-origin>`
4. Keep the public site launch state at `closed`.
5. Point the site/backend config at the pilot contract only if the team accepts that the public closed site will temporarily reference `CCATTEST`.
6. Run the self-only CorePass flow and record:
   - callback/app-link behavior
   - commit tx hash
   - finalize tx hash
   - assigned token id
   - decoded `tokenURI`

This path is the most meaningful pilot because it validates the real mainnet wallet and backend path.

## Script-Only Validation Path
Use this only if you need direct on-chain validation before the backend/site cutover decision.

Stage the self-only minter inputs locally:

```bash
export MINT_TO="<self-only-minter-address>"
export MINTER_ADDRESS="$MINT_TO"
```

Prepare the commit hash locally:

```bash
spark script script/CoreCatsPrepareMint.s.sol:CoreCatsPrepareMintScript \
  --fork-url "$CORE_MAINNET_RPC_URL" \
  --network-id 1
```

Then commit:

```bash
spark script script/CoreCatsCommitMint.s.sol:CoreCatsCommitMintScript \
  --fork-url "$CORE_MAINNET_RPC_URL" \
  --network-id 1 \
  --wallet-network mainnet \
  --keystore "$DEPLOYER_KEYSTORE_PATH" \
  --password-file "$DEPLOYER_PASSWORD_FILE" \
  --broadcast
```

After the finalize block has passed, finalize:

```bash
export MINTER_ADDRESS="$MINT_TO"

spark script script/CoreCatsFinalizeMint.s.sol:CoreCatsFinalizeMintScript \
  --fork-url "$CORE_MAINNET_RPC_URL" \
  --network-id 1 \
  --wallet-network mainnet \
  --keystore "$DEPLOYER_KEYSTORE_PATH" \
  --password-file "$DEPLOYER_PASSWORD_FILE" \
  --broadcast
```

Then identify the assigned token id for the self-only minter:

```bash
python3 scripts/read_live_token_evidence.py \
  --rpc-url "$CORE_MAINNET_RPC_URL" \
  --contract-address "$CORECATS_ADDRESS" \
  --owner-address "$MINT_TO"
```

Finally export and decode `tokenURI`:

```bash
python3 scripts/read_live_token_evidence.py \
  --rpc-url "$CORE_MAINNET_RPC_URL" \
  --contract-address "$CORECATS_ADDRESS" \
  --token-id "<assigned-token-id>" \
  --emit-token-uri
```

Important:
1. this validates the pilot contract on mainnet
2. it does not by itself validate the real CorePass/web/backend path
3. it does not replace the official final canary on the real `CCAT` contract
4. this `xcb_call`-based path is preferred on Core mainnet because `spark script` address parsing is not reliable for `cb...` readbacks

## Evidence To Save
Record separately from the official release:
1. deploy tx hashes
2. deployed addresses
3. assigned pilot token ids
4. commit/finalize tx hashes
5. decoded `tokenURI` evidence
6. the exact pilot labels used
7. whether validation was:
   - script-only
   - or backend + closed-site

## Source References
1. Foxar `spark script` wallet/keystore options:
   - https://foxar.dev/reference/cli/spark/script/
2. Mainnet RPC URL family:
   - https://github.com/core-coin/foxar/blob/master/utils/src/rpc.rs
3. Blockindex mainnet base URL family:
   - https://github.com/core-coin/corebc-rs/blob/master/corebc-core/src/types/network.rs
4. `spark-std` broadcast overloads:
   - https://github.com/foundry-rs/forge-std/blob/master/src/Vm.sol
