# Verify Inputs

This directory stores manual verification inputs for CoreCats contracts.

## Available Packets

### `mainnet/`
Official mainnet verification packet for the canonical `CCAT` deployment.

Files:
- `mainnet/CoreCatsOnchainData.standard-input.json`
- `mainnet/CoreCatsMetadataRenderer.standard-input.json`
- `mainnet/CoreCats.standard-input.json`
- `mainnet/CoreCatsMetadataRenderer.constructor-args.txt`
- `mainnet/CoreCats.constructor-args.txt`
- `mainnet/VERIFY_SUBMISSION.md`

### `devin/`
Core Devin rehearsal packet for the current source tree.

Files:
- `devin/CoreCatsOnchainData.standard-input.json`
- `devin/CoreCatsMetadataRenderer.standard-input.json`
- `devin/CoreCats.standard-input.json`
- `devin/CoreCatsMetadataRenderer.constructor-args.txt`
- `devin/VERIFY_SUBMISSION.md`

## Notes
- Compiler version: `1.1.2+commit.cb4b093a`
- Optimizer: enabled, runs `200`
- The `standard-input.json` files in this directory were regenerated from the current `foxar/` source tree after confirming that the deploy-relevant files are unchanged relative to the exact official mainnet deploy commit `d30f394f4da352871a5677bb32d702cd4aa55f8c`.
- For the official mainnet packet under `mainnet/`, treat those regenerated `standard-input.json` files as exact-deploy-equivalent inputs.
- Constructor argument files are deployment-specific and must match the target deployment addresses.
- `CoreCatsOnchainData` has no constructor arguments.
