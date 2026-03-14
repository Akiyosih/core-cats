# Core Testnet Deploy Runbook (Phase A)

Status: Rehearsed once on Core Devin (verify pending)

## 1. Purpose
Deploy and verify the current CoreCats Phase A contracts on Core testnet with reproducible steps:
1. `CoreCatsOnchainData`
2. `CoreCatsMetadataRenderer`
3. `CoreCats` with the renderer address pinned in the constructor

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
2. Confirm `totalSupply()` is `0`, `availableSupply()` is `1000`, and `reservedSupply()` is `0`.
3. Run one commit/finalize mint rehearsal.
4. Confirm `tokenURI(tokenId)` returns `data:application/json;base64,...`.
5. Decode metadata and confirm `image` is `data:image/svg+xml;base64,...`.

### 7.1 Static Configuration Check

```bash
CORECATS_ADDRESS="<deployed-corecats-address>" \
EXPECTED_RENDERER_ADDRESS="<deployed-renderer-address>" \
spark script script/CoreCatsPostDeployCheck.s.sol:CoreCatsPostDeployCheckScript \
  --fork-url "$CORE_TESTNET_RPC_URL" \
  --network-id 3
```

### 7.2 Commit Mint Rehearsal

Set a local commit seed once for the rehearsal:

```bash
export MINT_SEED="<32-byte-seed-as-bytes32>"
export MINT_QUANTITY=1
```

Then commit:

```bash
CORECATS_ADDRESS="<deployed-corecats-address>" \
spark script script/CoreCatsCommitMint.s.sol:CoreCatsCommitMintScript \
  --fork-url "$CORE_TESTNET_RPC_URL" \
  --network-id 3 \
  --broadcast
```

Wait until the commit finalize block has passed, then finalize:

```bash
CORECATS_ADDRESS="<deployed-corecats-address>" \
MINTER_ADDRESS="<committed-minter-address>" \
spark script script/CoreCatsFinalizeMint.s.sol:CoreCatsFinalizeMintScript \
  --fork-url "$CORE_TESTNET_RPC_URL" \
  --network-id 3 \
  --broadcast
```

If finalize fails with `status=0` and `energyUsed` matches the tx energy limit, retry with a higher multiplier:

```bash
CORECATS_ADDRESS="<deployed-corecats-address>" \
MINTER_ADDRESS="<committed-minter-address>" \
spark script script/CoreCatsFinalizeMint.s.sol:CoreCatsFinalizeMintScript \
  --fork-url "$CORE_TESTNET_RPC_URL" \
  --network-id 3 \
  --energy-estimate-multiplier 250 \
  --broadcast
```

### 7.3 TokenURI Decode Check (Manual)
Use this when you know the assigned `tokenId` and want explicit decoded artifacts (`tokenURI`, metadata JSON, SVG):

```bash
CORECATS_ADDRESS="<deployed-corecats-address>" TOKEN_ID="<assigned-token-id>" \
spark script script/CoreCatsExportTokenURI.s.sol:CoreCatsExportTokenURIScript \
  --fork-url "$CORE_TESTNET_RPC_URL" \
  --network-id 3
```

Then decode the returned `data:application/json;base64,...` and confirm:
1. metadata has expected `name` and `attributes`
2. `image` starts with `data:image/svg+xml;base64,`
3. decoded SVG renders correctly

The assigned token id is available from the `TokenAssigned` event emitted during finalize.

## 8. Verification
Attempt automated verification first only if the explorer exposes a compatible API.

Example commands (Blockscout-compatible verifier expectation):

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

### 8.1 Current Core Devin Result (2026-03-06)
Automated verification was attempted against:
1. `https://xab.blockindex.net/api/`
2. `https://xab.blockindex.net/api/v2/smart-contracts`

Both attempts failed immediately with:

```text
builder error: relative URL without a base
```

Current working interpretation:
1. Core Devin explorer is not exposing a usable Blockscout-compatible verification API at those public endpoints.
2. The explorer footer exposes `Get Verified`, which suggests the current verification flow is manual.
3. Use the prepared packet in `docs/verify_inputs/devin/VERIFY_SUBMISSION.md` for manual submission unless/until a proper API endpoint is provided.

## 9. Artifacts to Record
Record in `docs/worklogs/` after each rehearsal:
1. commit hash
2. deployed addresses
3. verifier links
4. mint/tokenURI check result
5. whether finalize required a higher energy multiplier
6. pass/fail and next action

## 10. Rollback Rule
If any check fails:
1. stop further deploy attempts
2. log exact error and command output
3. fix in branch and re-run from section 4

## 11. Known Gotchas (Observed in First Rehearsal)
1. `spark` may not be on `PATH`; if needed, use full path (example: `/home/<user>/.foxar/bin/spark`).
2. Core Devin script execution requires explicit `--network-id 3`.
3. `DEPLOYER_PRIVATE_KEY` must be Core/Foxar format (57-byte key; 114 hex chars, `0x` optional).
4. Commit/finalize mint is a two-step flow; do not expect a usable `tokenId` until finalize succeeds.
5. `run-latest.json` includes energy usage but not reliable fee totals in XAB; capture fee from explorer for final reporting.
6. Writing files from script via cheatcodes may require allowed paths; prefer stdout + shell decode for portability.
7. `finalizeMint` may need a higher `--energy-estimate-multiplier` on Core Devin even when simulation succeeds.

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

## 13. Recorded Rehearsal Snapshot (2026-03-06, Commit-Finalize)
1. Deployed:
   - `CoreCatsOnchainData`: `ab61bc332a3cafa28c5359587c438f087d99a24938b9`
   - `CoreCatsMetadataRenderer`: `ab6204d634c05880e35ea2c9c7cb03c9aa0a87f5c510`
   - `CoreCats`: `ab597892bace5d97cf2fffa9a6eb0d5664b54a4b39ba`
2. Deploy txs:
   - data: `0xa24773c70deb0d706e3202583991e5110c7eae51529221e3bb5c2dcd9f2b7959`
   - renderer: `0xb1e08f207d68afb31dcc551119c99492bc77e905586b939b447dc73e3243b2cd`
   - corecats: `0x4f037b590a133f6e4c54de50f805d7c2485ef7bf192c7855fc2f012cbac0cb60`
   - set renderer: `0xe8ff9dca18cf56f5c9de5cf9f2cc364a18898625a6d6c8894748ddd0684cf0fc`
3. Commit/finalize:
   - commit tx: `0x96d4d0c304df9bf7b912888859c03833dc2ed5dd0e69bb189d8afcbd6938b182`
   - finalize tx: `0xe47050c84f3f8ce7e00ade68848a5cca4a01d3784d11fb3943b075ac1bb5d262`
   - assigned token: `#492`
4. Readback:
   - `totalSupply = 1`
   - `availableSupply = 999`
   - `reservedSupply = 0`
   - `tokenURI(492)` decoded successfully to on-chain JSON + SVG
5. Notes:
   - signer mode: deployer
   - finalize was broadcast with `--energy-estimate-multiplier 250`
   - decoded traits: `tortoiseshell / orange_white / none / common`
6. Verify status:
   - automated explorer verify attempted
   - public explorer endpoints did not behave as Blockscout-compatible verifier endpoints
   - manual submission packet prepared in `docs/verify_inputs/devin/VERIFY_SUBMISSION.md`
