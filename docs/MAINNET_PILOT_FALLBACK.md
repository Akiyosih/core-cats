# Core Cats Mainnet Pilot Fallback

Status: Optional fallback if CorePass testnet validation is still unavailable

## Purpose
Define the fallback path to use only if:
1. CorePass testnet remains unavailable or practically unusable for final validation, and
2. the project does not want the first operator mint to live on the official CoreCats contract.

This is a release-engineering fallback, not a redesign of CoreCats.

## Default Path vs Fallback Path
1. Default path:
   - deploy the official CoreCats contract on mainnet
   - keep launch state `closed`
   - run a controlled canary on the official contract
   - move to `public` only after success
2. Optional fallback path:
   - deploy a separate self-only pilot contract on mainnet first
   - validate real CorePass/mainnet behavior there
   - then deploy the official CoreCats contract
   - then run an official final canary on the real CoreCats contract
   - then move to `public`

The fallback path is justified only when the pilot meaningfully reduces release risk or preserves the desired official contract history.

## Non-negotiable Rules
1. The pilot must be self-only, not a public release.
2. The pilot must be clearly distinguishable from the official CoreCats release.
3. The pilot must preserve production logic as closely as possible.
4. Pilot success does not replace the official final canary.

## Why Official Final Canary Is Still Required
1. The mint authorization message includes `address(this)`.
2. A different contract address means a different signing domain.
3. Therefore, a pilot proves the wallet flow and the mainnet environment, but it does not fully prove the final official contract path by itself.

## What Should Stay Identical
1. Mint logic
2. Signature verification logic
3. Replay protection assumptions
4. Random assignment logic
5. Quantity mint behavior (`1 / 2 / 3`)
6. Supply logic (`MAX_SUPPLY = 1000`)
7. `tokenURI` structure and on-chain SVG generation, except for human-facing pilot labels if used

Do not create a pilot that passes only because it is materially simpler than production.

## What May Differ
Only human-facing release labels and explicitly approved safety labeling may differ:
1. collection name
2. token symbol
3. token-level metadata name prefix
4. token-level metadata description
5. README / VERIFY / deployment notes

The pilot must be unmistakably non-official in wallets, explorers, and repository documentation.

## Supply and Mint Scope
1. Keep the production supply logic unchanged.
2. Do not create a tiny-cap pilot contract if the goal is to validate production behavior.
3. Instead, keep the full `MAX_SUPPLY = 1000` logic and perform only a very small number of operator-only mints on the pilot.

This preserves realism without exposing the pilot as a public collection.

## Current Repository Implication
The current `main` branch does not yet expose pilot-specific labels as runtime configuration.

At the moment:
1. `CoreCats.sol` hard-codes `CoreCats` / `CCAT`
2. `CoreCatsMetadataRenderer.sol` hard-codes `CoreCats #` and `CoreCats fully on-chain 24x24 SVG.`

If the project chooses this fallback path, a small implementation pass is required to make those human-facing labels configurable without changing the mint/security logic.

## Recommended Sequence If Fallback Is Used
1. Add pilot-specific label configurability only where needed.
2. Deploy the self-only pilot contract on mainnet.
3. Validate:
   - CorePass sign
   - CorePass commit tx
   - finalize path
   - callback/app-link behavior
   - token assignment
   - on-chain `tokenURI`
4. Record pilot evidence separately from the official release.
5. Deploy the official CoreCats contract.
6. Run one official final canary on the official contract.
7. Open public mint only after that official canary succeeds.

## Decision Rule
Use this fallback only if all of the following are true:
1. CorePass testnet validation is still unavailable in time.
2. The team does not want the first operator mint on the official contract.
3. The extra deployment/documentation overhead is acceptable.

Otherwise, stay with the default `closed -> canary -> public` path on the official contract.
