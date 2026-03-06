# Core Testnet Deploy Runbook (Phase A)

Last updated: 2026-03-06
Status: Rehearsed once on Core Devin (verify pending)

## 1. Purpose
Deploy and verify the current CoreCats Phase A contracts on Core testnet with reproducible steps:
1. `CoreCatsOnchainData`
2. `CoreCatsMetadataRenderer`
3. `CoreCats` (then `setMetadataRenderer`)

## 2. Preconditions
1. Work branch is up to date and tests are green.
2. Official Core ecosystem network parameters (RPC, network id, explorer verifier endpoint) are validated before use.
3. You have a funded deployer account for testnet gas.

## 3. Required Environment Variables
Set these in the same shell before running commands:

```bash
export CORE_TESTNET_RPC_URL="<official-core-testnet-rpc-url>"
export DEPLOYER_PRIVATE_KEY="<deployer-private-key-string>"
```

`DEPLOYER_PRIVATE_KEY` must use the Core/Foxar private key string format (57-byte key; not Ethereum 32-byte hex key).  
If key format is wrong, script execution fails with `Wrong private key length`.

Optional for verification:

```bash
export VERIFIER_URL="<core-explorer-verifier-api-url>"
export NETWORK="<core-testnet-name-or-id>"
```

## 4. Build and Test Gate
From `core-cats/foxar`:

```bash
spark build
spark test
```

Expected: all tests pass before any broadcast.

## 5. Dry Run (No Broadcast)

```bash
spark script script/CoreCatsDeploy.s.sol:CoreCatsDeployScript \
  --fork-url "$CORE_TESTNET_RPC_URL" \
  --network-id 3
```

Expected: script simulation succeeds with no revert.

## 6. Broadcast Deploy

```bash
spark script script/CoreCatsDeploy.s.sol:CoreCatsDeployScript \
  --fork-url "$CORE_TESTNET_RPC_URL" \
  --network-id 3 \
  --broadcast
```

Capture deployed addresses from output:
1. `CoreCatsOnchainData`
2. `CoreCatsMetadataRenderer`
3. `CoreCats`

Note: For current Core Devin RPC behavior, explicit `--network-id 3` is required in script execution.
Without it, signing may fail with `Invalid network id prefix in address`.

## 7. Post-Deploy Checks
1. Confirm `CoreCats.metadataRenderer()` equals deployed renderer address.
2. Mint one test token via valid signature flow.
3. Confirm `tokenURI(tokenId)` returns `data:application/json;base64,...`.
4. Decode metadata and confirm `image` is `data:image/svg+xml;base64,...`.

Optional automation (recommended): run post-deploy check script.

```bash
CORECATS_ADDRESS="<deployed-corecats-address>" \
EXPECTED_RENDERER_ADDRESS="<deployed-renderer-address>" \
spark script script/CoreCatsPostDeployCheck.s.sol:CoreCatsPostDeployCheckScript \
  --fork-url "$CORE_TESTNET_RPC_URL" \
  --network-id 3
```

### 7.1 TokenURI Decode Check (Manual)
Use this when you want explicit decoded artifacts (`tokenURI`, metadata JSON, SVG):

```bash
CORECATS_ADDRESS="<deployed-corecats-address>" TOKEN_ID=1 \
spark script script/CoreCatsExportTokenURI.s.sol:CoreCatsExportTokenURIScript \
  --fork-url "$CORE_TESTNET_RPC_URL" \
  --network-id 3
```

Then decode the returned `data:application/json;base64,...` and confirm:
1. metadata has expected `name` and `attributes`
2. `image` starts with `data:image/svg+xml;base64,`
3. decoded SVG renders correctly

## 8. Verification
Verify each deployed contract (example uses blockscout-compatible verifier):

```bash
spark verify-contract <DATA_ADDRESS> src/CoreCatsOnchainData.sol:CoreCatsOnchainData \
  --verifier blockscout \
  --verifier-url "$VERIFIER_URL" \
  --network "$NETWORK" \
  --watch

spark verify-contract <RENDERER_ADDRESS> src/CoreCatsMetadataRenderer.sol:CoreCatsMetadataRenderer \
  --constructor-args <ABI_ENCODED_DATA_ADDRESS> \
  --verifier blockscout \
  --verifier-url "$VERIFIER_URL" \
  --network "$NETWORK" \
  --watch

spark verify-contract <CORECATS_ADDRESS> src/CoreCats.sol:CoreCats \
  --verifier blockscout \
  --verifier-url "$VERIFIER_URL" \
  --network "$NETWORK" \
  --watch
```

If constructor args encoding is needed, generate once and store in a file:

```bash
spark verify-contract <RENDERER_ADDRESS> src/CoreCatsMetadataRenderer.sol:CoreCatsMetadataRenderer \
  --constructor-args-path <path-to-abi-encoded-args-file> \
  --verifier blockscout \
  --verifier-url "$VERIFIER_URL" \
  --network "$NETWORK" \
  --watch
```

## 9. Artifacts to Record
Record in `docs/worklogs/` after each rehearsal:
1. commit hash
2. deployed addresses
3. verifier links
4. mint/tokenURI check result
5. pass/fail and next action

## 10. Rollback Rule
If any check fails:
1. stop further deploy attempts
2. log exact error and command output
3. fix in branch and re-run from section 4

## 11. Known Gotchas (Observed in First Rehearsal)
1. `spark` may not be on `PATH`; if needed, use full path (example: `/home/<user>/.foxar/bin/spark`).
2. Core Devin script execution requires explicit `--network-id 3`.
3. `DEPLOYER_PRIVATE_KEY` must be Core/Foxar format (57-byte key; 114 hex chars, `0x` optional).
4. `run-latest.json` includes energy usage but not reliable fee totals in XAB; capture fee from explorer for final reporting.
5. Writing files from script via cheatcodes may require allowed paths; prefer stdout + shell decode for portability.

## 12. Recorded Rehearsal Snapshot (2026-03-05)
1. Block hash: `0x2a3a34da50127b9899e7d4f7ef7d838a736a01094cf3abce5a17fb1316fb5f83`
2. Deployed:
   - `CoreCatsOnchainData`: `ab955ac6d28cfd8dd41fcae677dc8968c4b26e1f17b1`
   - `CoreCatsMetadataRenderer`: `ab46969ce93676eb4ff5a82e02a1c712f7d076ca1901`
   - `CoreCats`: `ab58e879a3b77a58dbd2a0016a2ee56a8b6352ccaec5`
3. First mint tx: `0x5737a54e14a0418e6788ef6aee8b25d05db33e250fa4580141b06b4fcc583650`
4. Fee summary:
   - deploy total: `0.007050933 XAB`
   - first mint: `0.000129074 XAB`
