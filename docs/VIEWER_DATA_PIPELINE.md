# Viewer Data Pipeline

Last updated: 2026-03-06

## Purpose
Generate UI-ready collection data from the current Core on-chain renderer without depending on missing local PNG preview files.

This pipeline is local-only and does not change the Core deployment path.

Core deployment/compiler source of truth remains:
- https://foxar.dev/intro/
- https://github.com/core-coin/ylem

## Inputs
1. `manifests/final_1000_manifest_v1.json`
2. `manifests/trait_display_labels_v1.json`
3. `manifests/final_1000_trait_summary_v1.json`
4. `foxar/src/CoreCatsOnchainData.sol`
5. `foxar/src/CoreCatsMetadataRenderer.sol`

## Command
Run from the `core-cats` repository root:

```bash
node scripts/ui/generate_viewer_data.mjs
```

Optional:

```bash
node scripts/ui/generate_viewer_data.mjs --emit-svg-files
```

## Outputs
Default output directory:

`manifests/viewer_v1/`

Generated files:
1. `collection.json`
   - UI-ready 1000 item dataset
   - includes `image_data_uri` for direct rendering
   - includes exact on-chain attributes and UI display labels
2. `filters.json`
   - filter labels and counts for `/collection`
3. `summary.json`
   - viewer-facing summary derived from the trait summary manifest

Optional output:
1. `svg/*.svg`
   - one SVG preview per token when `--emit-svg-files` is used

## Notes
1. The script does not use Core testnet/mainnet RPC.
2. It reads the packed on-chain data constants from `foxar/src/CoreCatsOnchainData.sol` directly.
3. It ports the current renderer logic into JS and verifies decoded traits against `final_1000_manifest_v1.json` before writing outputs.
4. This is the current source for `/collection`, `/about`, and `/transparency`, and it remains compatible with the live `commit-finalize` mint flow.
