# Core Devin Manual Verify Submission

Status: Current-source packet prepared; fresh Devin redeploy required before submission

## Current State
1. The standard-input JSON files in this directory were regenerated from the current source tree.
2. The current `foxar/` source tree is also deploy-equivalent to the exact official mainnet deploy commit for the active CoreCats contracts, but that does not make the old 2026-03-06 Devin rehearsal addresses valid targets.
3. As a result, this directory should be used only after a fresh Devin redeploy of the current source tree.

## Deployment Addresses
Populate this section after the next Devin redeploy of the current source revision.

## Compiler Settings
1. Compiler: `1.1.2+commit.cb4b093a`
2. Optimizer: enabled
3. Optimizer runs: `200`

## Files
1. `CoreCatsOnchainData.standard-input.json`
2. `CoreCatsMetadataRenderer.standard-input.json`
3. `CoreCats.standard-input.json`
4. `CoreCatsMetadataRenderer.constructor-args.txt`

## Renderer Constructor Args
Populate `CoreCatsMetadataRenderer.constructor-args.txt` after the next Devin redeploy using the
fresh `CoreCatsOnchainData` address from that deployment.

## Automated Verify Attempt Result
Automated submission through `spark verify-contract` was attempted against:
1. `https://xab.blockindex.net/api/`
2. `https://xab.blockindex.net/api/v2/smart-contracts`

Both attempts failed immediately with the same response:
- `builder error: relative URL without a base`

Interpretation:
- The public Core Devin explorer does not appear to expose a usable Blockscout-compatible verification API at those endpoints.
- The explorer footer exposes `Get Verified`, which suggests a manual verification path is available.

## Suggested Manual Submission Packet
Send the following together:
1. contract address
2. contract path/name
3. compiler version
4. optimizer settings
5. standard-input JSON
6. renderer constructor args file
7. deployment tx hashes from the current Devin redeploy run

## Relevant Explorer
- https://xab.blockindex.net/
