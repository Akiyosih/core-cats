# Core Devin Manual Verify Submission

Last updated: 2026-03-06
Status: Prepared for manual explorer verification

## Deployment Being Verified
1. `CoreCatsOnchainData`: `ab61bc332a3cafa28c5359587c438f087d99a24938b9`
2. `CoreCatsMetadataRenderer`: `ab6204d634c05880e35ea2c9c7cb03c9aa0a87f5c510`
3. `CoreCats`: `ab597892bace5d97cf2fffa9a6eb0d5664b54a4b39ba`

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
The renderer constructor was deployed with the data contract address:
- `ab61bc332a3cafa28c5359587c438f087d99a24938b9`

ABI-encoded constructor args file:
- `CoreCatsMetadataRenderer.constructor-args.txt`

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
7. deployment tx hashes from `docs/CORE_TESTNET_DEPLOY_RUNBOOK.md`

## Relevant Explorer
- https://xab.blockindex.net/
