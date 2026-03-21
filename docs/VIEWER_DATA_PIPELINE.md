# Viewer Data Pipeline


## Purpose
Generate UI-ready collection data from the current Core on-chain renderer without depending on missing local PNG preview files.

This pipeline is local-only and does not change the Core deployment path.

Core deployment/compiler source of truth remains:
- https://foxar.dev/intro/
- https://github.com/core-coin/ylem

## Inputs
1. historical pre-beam base manifest: `manifests/final_1000_manifest_v1.json`
2. active beam selection: `manifests/superrare_beam_selection.json`
3. active beam reorder: `manifests/beam_token_reorder.json`
4. `manifests/trait_display_labels_v1.json`
5. active summary: `manifests/final_1000_trait_summary.json`
6. `foxar/src/CoreCatsOnchainData.sol`
7. `foxar/src/CoreCatsMetadataRenderer.sol`

Upstream rebuild step when the canonical art/ordering changes:

```bash
node scripts/ui/rebuild_final1000_beam_outputs.mjs
python3 scripts/reference_eth/generate_onchain_data.py
```

## Command
Run from the `core-cats` repository root:

```bash
node scripts/ui/generate_viewer_data.mjs
```

Then run from `core-cats/web`:

```bash
npm run build:viewer-previews
```

Optional:

```bash
node scripts/ui/generate_viewer_data.mjs --emit-svg-files
```

## Outputs
Default output directory:

`manifests/viewer/`

Default public preview directory:

`web/public/viewer/svg/`

Generated files:
1. `collection.json`
   - UI-ready 1000 item dataset
   - includes `image_svg_src` pointing at static preview SVG files under `web/public/viewer/svg/`
   - includes `image_preview_src` pointing at static preview PNG files under `web/public/viewer/png/`
   - includes exact on-chain attributes and UI display labels
   - does not embed large `data:` URIs by default
2. `filters.json`
   - filter labels and counts for `/collection`
3. `summary.json`
   - viewer-facing summary derived from the trait summary manifest

Default preview output:
1. `web/public/viewer/svg/*.svg`
   - one renderer-derived SVG preview per token
2. `web/public/viewer/png/*.png`
   - one rasterized preview per token for the homepage and collection grid

Optional:
1. `--embed-data-uri`
   - re-add `image_data_uri` to `collection.json` if inline rendering is explicitly needed

## Notes
1. The script does not use Core testnet/mainnet RPC.
2. It reads the packed on-chain data constants from `foxar/src/CoreCatsOnchainData.sol` directly.
3. It ports the current renderer logic into JS and verifies decoded traits against `final_1000_manifest.json` before writing outputs.
4. The current web UI uses static PNG previews for browsing performance while preserving the same renderer-derived SVG for detail views and verification.
5. This is the current source for `/collection`, `/about`, and `/transparency`, and it remains compatible with the live `commit-finalize` mint flow.
6. For the no-logo launch path, the upstream manifest rebuild also fixes the canonical `beam` superrare selection and the final token reorder map before viewer generation runs.

## External Review Shortcut
If an outside reader wants a practical renderer / metadata check without rebuilding the whole site, the shortest path is:

1. read a live minted token directly from the deployed contract
2. compare that `tokenURI` output with the published browse artifacts
3. compare the published browse artifacts with the local viewer pipeline inputs and outputs

### Step 1: Read a live tokenURI
Run from the `core-cats` repository root:

```bash
python3 scripts/read_live_token_evidence.py \
  --rpc-url "$CORE_MAINNET_RPC_URL" \
  --contract-address "<corecats-contract-address>" \
  --token-id "<minted-token-id>" \
  --emit-token-uri
```

This returns:
1. the linked metadata renderer address
2. the decoded metadata `name`
3. the decoded metadata `description`
4. the attribute count
5. the `image` prefix
6. the full `tokenURI` when `--emit-token-uri` is used

### Step 2: Compare with the published browse surface
For the same token id:

1. open `/cats/<tokenId>` on the public site
2. compare the displayed trait labels with the decoded `tokenURI` attributes
3. compare the published preview image with the on-chain SVG / metadata result
4. compare the integrity fields shown on the detail page:
   - `variant_key`
   - `final_png_24_sha256`

The public cat detail page is meant to give a human-readable bridge between the on-chain token metadata and the static browse artifacts.

### Step 3: Rebuild the local viewer output
If a reviewer wants to regenerate the browse artifacts locally:

```bash
node scripts/ui/generate_viewer_data.mjs
npm --prefix web run build:viewer-previews
```

Then compare:
1. `manifests/viewer/collection.json`
2. `web/public/viewer/svg/<tokenId>.svg`
3. `web/public/viewer/png/<tokenId>.png`
4. `web/public/viewer/png-white/<tokenId>.png`

### What This Review Path Proves
This shortcut can help an outside reader confirm:

1. the live contract still returns fully on-chain JSON + SVG through `tokenURI`
2. the published browse previews are consistent with the current renderer/data pipeline
3. the public viewer is a convenience surface built from the same published art/manifests rather than a separate hidden art source

### What It Does Not Prove
This shortcut does not, by itself, prove:

1. explorer verification completeness
2. imported dependency safety without reviewing the verified source / verify packet
3. that every public preview PNG was regenerated from the exact same build on a given deployment without also checking the published evidence packet
