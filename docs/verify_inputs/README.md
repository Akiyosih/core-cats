# Verify Inputs

This directory stores manual verification inputs for current-source CoreCats contracts.

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
- The `standard-input.json` files are compiler inputs for the current source tree and are network-agnostic.
- Constructor argument files are deployment-specific and must match the target deployment addresses.
- `CoreCatsOnchainData` has no constructor arguments.
