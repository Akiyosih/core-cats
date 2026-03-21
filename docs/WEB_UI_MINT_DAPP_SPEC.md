# Core Cats Web UI / Mint DApp Spec (Core-First Draft)

Status: Draft aligned to current `core-cats` repository state

## Purpose
This document corrects the external Web UI / Mint DApp draft against the current repository, current contract implementation, and current Core Devin rehearsal status.

## Current Source of Truth
1. Active implementation repository: `core-cats`
2. Reference/archive repository only: `core-cats-eth`
3. Active Core contract implementation:
   - `foxar/src/CoreCats.sol`
   - `foxar/src/CoreCatsMetadataRenderer.sol`
   - `foxar/src/CoreCatsOnchainData.sol`
4. Final art/trait source of truth:
   - `manifests/final_1000_manifest_v1.json`
   - `manifests/trait_display_labels_v1.json`
   - `docs/FINAL1000_TRAIT_SCHEMA.md`

## Hard Corrections to the External Draft
1. The project is no longer `ETH first -> Core later`.
   - Current execution order is Core-first.
   - `core-cats-eth` remains a reference archive, not the active delivery path.
2. UI planning must follow current Core contract reality, not the historical ETH reference contracts.
3. `selected.json` is not the current source of truth.
   - Use `manifests/final_1000_manifest_v1.json` instead.
4. Explorer/verification wording must be Core explorer / Blockindex centric, not Etherscan centric.
5. Current contract branch introduces quantity mint and transparent randomness via a two-step flow:
   - `commitMint(uint8 quantity, bytes32 commitHash)`
   - `finalizeMint(address minter)`
   - Quantity `1 / 2 / 3` is part of this interface.
6. Current Core Devin rehearsal already covers both the older single-step mint and the newer random assignment branch.
   - UI and runbooks must distinguish which deployed checkpoint is being referenced.
7. Current contract is not enumerable.
   - Do not implement `/my-cats` assuming `tokenOfOwnerByIndex`.
   - Ownership listing requires event indexing, explorer/API lookup, or an app-side cache/index.
8. Transparent random assignment is implemented in the active contract branch as:
   - `commit-finalize + future blockhash + lazy Fisher-Yates`
   - and it has been re-rehearsed on Core Devin
9. There is now a frontend project scaffold in this repository.
   - `web/` contains the current Next.js foundation and viewer pages.
9. The manifest references local art file paths, but this repository does not currently track those preview/image files.
   - UI work must not assume `art/...png` paths already exist in the public repo state.

## Current Confirmed Core Devin Checkpoint
1. Rehearsal deployment succeeded on 2026-03-05.
2. Deployed addresses:
   - `CoreCatsOnchainData`: `ab955ac6d28cfd8dd41fcae677dc8968c4b26e1f17b1`
   - `CoreCatsMetadataRenderer`: `ab46969ce93676eb4ff5a82e02a1c712f7d076ca1901`
   - `CoreCats`: `ab58e879a3b77a58dbd2a0016a2ee56a8b6352ccaec5`
3. `tokenId = 1` was minted successfully on Core Devin.
4. `tokenURI(1)` was decoded and confirmed to return on-chain JSON with on-chain Base64 SVG.

## Current Confirmed Core Devin Randomness Checkpoint
1. Commit/finalize rehearsal succeeded on 2026-03-06.
2. Deployed addresses:
   - `CoreCatsOnchainData`: `ab61bc332a3cafa28c5359587c438f087d99a24938b9`
   - `CoreCatsMetadataRenderer`: `ab6204d634c05880e35ea2c9c7cb03c9aa0a87f5c510`
   - `CoreCats`: `ab597892bace5d97cf2fffa9a6eb0d5664b54a4b39ba`
3. `commitMint -> finalizeMint` succeeded on Core Devin.
4. Randomly assigned token `#492` was minted and `tokenURI(492)` was decoded to on-chain JSON with on-chain Base64 SVG.

## Initial Public UI Goals
The external draft direction is broadly correct. The initial public UI should still aim for:
1. `/`
2. `/about`
3. `/mint`
4. `/collection`
5. `/my-cats`
6. `/transparency`

However, implementation order must respect current contract/backend constraints.

## Page-Level Notes
### `/`
Keep as the public landing page.
Focus on:
1. 24x24 full on-chain pixel art
2. free mint
3. zero royalty
4. verifiable transparency
5. direct links to collection/transparency/GitHub

### `/about`
Good fit for:
1. artistic intent
2. full on-chain explanation
3. tokenURI / SVG / metadata explanation
4. current Core-first delivery path
5. future CorePass / KYC expansion as a later phase

### `/mint`
The external draft needs these corrections:
1. `1 / 2 / 3` quantity mint is part of the current Core contract interface.
2. The live flow is two-step:
   - `commitMint(...)`
   - `finalizeMint(minter)`
3. `finalizeMint(minter)` is permissionless by design.
   - a relayer/service may finalize pending commits
   - the manual fallback path may still ask CorePass to send `finalizeMint(minter)`
4. The intended official contract path is permissionless at the contract layer.
   - no allowlist
   - no off-chain mint authorization signature
5. Active web implementation no longer treats an injected browser wallet as the primary Core path.
6. `/mint` now uses CorePass protocol requests directly:
   - `corepass:sign` to bind a concrete `coreID` to the mint session
   - `corepass:tx` for `commitMint(...)`
   - relayer-assisted `finalizeMint(minter)` as the primary convenience path
   - `corepass:tx` for manual `finalizeMint(minter)` only if relayer finalize is unavailable
7. The Next.js app now exposes CorePass session routes:
   - `/api/mint/corepass/session`
   - `/api/mint/corepass/session/finalize`
   - `/api/mint/corepass/callback`
8. Legacy authorization routes may still exist for rehearsal compatibility, but the intended official mint path does not depend on them.
9. UI must explain the two-step mint clearly enough that users understand:
   - commit does not immediately reveal the assigned cat
   - finalize happens after the required future block boundary
   - desktop enters CorePass by QR while same-device opens CorePass directly on the phone, and both paths should return to the browser tab without relying on a CorePass webview mint surface
10. Current implementation detail:
   - CorePass mint session state is stored in-memory in the Next.js server runtime
   - that is acceptable for local/testnet iteration
   - production should replace it with a durable shared store before public launch
11. Current local validation status:
   - the available CorePass app in the active user environment exposes only mainnet `cb...` accounts
   - it does not currently expose Devin testnet `ab...` accounts
   - therefore live CorePass E2E on Devin remains unverified even though the CorePass-first mint UI is now implemented

### Launch Status Model
Web publication and public mint opening are separate operational steps.

The UI should support three launch states:
1. `closed`
   - website is public
   - `/mint` is visible
   - copy explains that launch is not open yet
   - the website-guided mint path is intentionally not opened/promoted yet even though the final official contract design is permissionless
2. `canary`
   - mint is live only for a small operator allowlist
   - copy explains that controlled mainnet validation is in progress
3. `public`
   - normal public mint flow is open

Implications:
1. `/collection`, `/about`, and `/transparency` can be public before mint opens.
2. `/mint` must not assume that page visibility means public mint is open.
3. The production web app should switch between `closed`, `canary`, and `public` without redesigning the mint flow.
4. If quantity `2 / 3` is not yet canary-validated on mainnet, the public UI should temporarily expose only quantity `1`.
5. See `docs/WEB_PUBLICATION_POLICY.md` for publication/hosting/origin policy around these states.

### `/collection`
This is a good early UI target because the static collection data already exists.

Use `manifests/final_1000_manifest_v1.json` as the base dataset.

Recommended filter source of truth:
1. `Pattern`
2. `Color Variation`
3. `Collar`
4. `Rarity Tier`
5. `Rarity Type`

Optional extra filter:
1. `category`

Do not make `eye / nose / accessory` primary source-of-truth fields.
If desired, they can be derived from `Rarity Type` for UI convenience later.

### `/my-cats`
Keep this in the spec, but mark it as dependent on owner indexing.

Current contract limitation:
1. ownership enumeration is not available from contract alone
2. app must use indexed `Transfer` history or a backend/cache layer

### `/transparency`
This page is required and should be treated as a core deliverable, not a nice-to-have.

It should link to:
1. GitHub repository
2. deployed Core contract addresses
3. Core explorer / Blockindex pages
4. ABI / verification docs
5. trait schema and manifest docs
6. work procedure / runbook

## Data Model Guidance
### Static build-time source
Use:
1. `manifests/final_1000_manifest_v1.json`
2. `manifests/trait_display_labels_v1.json`
3. `manifests/final_1000_trait_summary_v1.json`

Important:
1. the manifest contains path references such as `final_png_24`, `review_file`, and `base_preview_file`
2. those files are not currently tracked in this repository state
3. frontend work must generate or import public preview assets explicitly

### Derived frontend data (recommended)
These files do not exist yet, but they are good targets for frontend build outputs:
1. `public/data/collection.json`
2. `public/data/traits-index.json`
3. `public/data/rarity-summary.json`
4. `public/previews/<id>.png` or another explicit preview asset directory

### Runtime data
These should be resolved at runtime or through a lightweight backend:
1. minted / unminted status
2. owner
3. latest mint history
4. session persistence / finalize coordination

## tokenId / artId Rule
This is now mostly settled for the final mainnet randomness design and must not be hand-waved in UI code.

Current state:
1. the final manifest already assigns fixed `token_id` values `1..1000`
2. the active random assignment contract maps mints fairly from the remaining token pool
3. Core Devin rehearsal for that random assignment path has already succeeded

UI rule:
1. do not hard-code assumptions that mint order equals `tokenId`
2. the viewer should treat `tokenId` as the canonical art identity after finalize
3. minted/unminted state should be layered on top of the fixed manifest data

## CorePass / KYC Policy
Initial public UI should not be blocked on CorePass/KYC integration.

Current policy:
1. initial public path: CorePass QR / direct-launch mint using protocol-level `sign` and `tx` requests
2. future extension: CorePass Authorization / KYC gating
3. do not block the public mint flow on full Connector/Auth integration before the rest of the system is proven
4. if KYC gating is added later, it should extend the existing CorePass-first mint session rather than replace it with an unrelated wallet flow
5. CorePass testnet wallet availability must be confirmed before treating Devin/mobile E2E as complete

## Security Notes for UI/API
1. finalizer key or keystore material must stay off Vercel in production
2. `.env` must never be tracked
3. CorePass session handling must enforce:
   - short session TTL
   - callback/session binding
   - durable storage before public production use
4. if a legacy authorization endpoint is kept for rehearsal compatibility, it must enforce:
   - short expiry
   - one-time nonce usage
   - rate limiting
5. frontend restrictions alone are never sufficient
6. relayer finalize is an operational convenience only
   - the contract remains permissionless, so manual finalize must stay possible even if the relayer is unavailable

## Recommended UI Implementation Order
1. Extend the existing `web/` Next.js foundation
2. Keep static collection viewer data generation from `final_1000_manifest_v1.json`
3. Refine `/collection`
4. Refine `/about`
5. Refine `/transparency`
6. Implement launch-state handling for `/mint` (`closed`, `canary`, `public`)
7. Decide owner-indexing approach for `/my-cats`
8. Replace the temporary in-memory CorePass mint session store with a durable production store
9. Harden the CorePass callback/finalize routes for production operation
10. Refine `/mint` around `login/wallet-bind -> commitMint -> auto-finalize`, while keeping any manual/operator finalize recovery internal-only
11. Add any final landing page visual refinements

## Publication / Hosting Constraint
The current `web/` should be treated as the long-lived public app.

Implications:
1. teaser publication should generally use the same app/origin that later serves public mint
2. the default deployment target should support the current Next.js server-side routes
3. `github.io`-style static-only publication is not the default for the current app shape
4. teaser-facing visual curation does not need a separate logo-hide policy on the current no-logo beam-superrare path

## Non-Goals for the First Public UI
1. mandatory CorePass / KYC gating
2. admin dashboard
3. marketplace integration
4. complex ranking/social features
5. pretending unresolved contract assumptions are already solved

## Acceptance Gate Before Mint UI Is Considered Final
1. Final mint contract interface is fixed
2. Random assignment policy is implemented and documented as `commit-finalize + future blockhash + lazy Fisher-Yates`
3. Signature API contract compatibility is tested
4. Launch-state behavior (`closed`, `canary`, `public`) is implemented
5. Owner indexing method for `/my-cats` is explicitly chosen
6. CorePass callback/browser-return behavior is tested on both desktop and mobile paths with a wallet that can actually transact on the target network
7. Transparency page links are real and reproducible
8. If the public launch exposes quantity `2 / 3`, that quantity path has been validated on the target network, or the UI is temporarily constrained to quantity `1`
