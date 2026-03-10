# Core Cats Work Procedure (Mainnet Closed Launch Path)

Version: v3.1

## 0. Non-negotiable Rules
1. Final target chain is Core Blockchain mainnet.
2. Product semantics must stay stable from now through launch.
3. Public website publication and public mint opening are separate events.
4. Mainnet launch must follow `closed -> canary -> public`, not immediate open mint.
5. Historical fallback phases B/C are retired from the active plan unless a new blocker is discovered and documented.
6. The default launch path is the official CoreCats contract itself. A separate self-only mainnet pilot is optional fallback only, not the default path.

## 1. Product Invariants (Must Not Change)
1. Total supply: 1000 fixed.
2. Mint policy: free mint, zero royalty.
3. Fully on-chain metadata and SVG (`tokenURI` returns data URI JSON/SVG).
4. Trait semantics match the final manifest.
5. Random assignment policy: `commit-finalize + future blockhash + lazy Fisher-Yates`.
6. Mint interface policy: quantity `1 / 2 / 3` through `commitMint(...)` and permissionless `finalizeMint(minter)`.

## 2. Current Baseline
1. Active implementation repository: `core-cats`.
2. `core-cats-eth` is reference/archive only.
3. Final 1000 manifest and trait schema are fixed in repository artifacts.
4. Current `main` already contains:
   - Core-compatible contracts
   - Core Devin deploy/mint/tokenURI rehearsal
   - transparent random assignment
   - Next.js viewer foundation
   - CorePass-first mint flow scaffold
5. The remaining path is no longer "how to make Core compile"; it is "how to launch safely on Core mainnet".

## 2.1 What Is Already Proven
1. Core contract build/test path succeeds on the direct Core implementation line.
2. Core Devin deployment succeeded.
3. On-chain `tokenURI` readback was decoded to JSON + SVG.
4. Random assignment via `commit-finalize + future blockhash + lazy Fisher-Yates` was re-rehearsed successfully.
5. Web viewer and CorePass-first mint UI scaffold exist in `web/`.

## 2.2 Current Core Devin Checkpoint
1. Re-rehearsal deployment:
   - `CoreCatsOnchainData`: `ab61bc332a3cafa28c5359587c438f087d99a24938b9`
   - `CoreCatsMetadataRenderer`: `ab6204d634c05880e35ea2c9c7cb03c9aa0a87f5c510`
   - `CoreCats`: `ab597892bace5d97cf2fffa9a6eb0d5664b54a4b39ba`
2. Commit/finalize result:
   - commit tx: `0x96d4d0c304df9bf7b912888859c03833dc2ed5dd0e69bb189d8afcbd6938b182`
   - finalize tx: `0xe47050c84f3f8ce7e00ade68848a5cca4a01d3784d11fb3943b075ac1bb5d262`
   - assigned token: `#492`
3. Readback:
   - `totalSupply = 1`
   - `availableSupply = 999`
   - decoded `tokenURI(492)` confirmed on-chain JSON/SVG
4. Explorer verify:
   - automated public-endpoint attempts were made
   - a public verify API was not confirmed
   - a manual verify packet was prepared in `docs/verify_inputs/devin/`

## 2.3 External Wallet Dependency Snapshot
1. The intended production wallet UX is CorePass QR/app-link.
2. In the current local environment, the available CorePass app exposes only a mainnet `cb...` account.
3. A Devin testnet `ab...` CorePass account is not currently available in that environment.
4. Therefore:
   - Core Devin contract/randomness validation remains valid
   - CorePass E2E on Devin remains unverified
   - the first real CorePass transaction validation may need to happen on mainnet
   - default mainnet path is a controlled canary on the official contract
   - optional fallback path is a self-only mainnet pilot followed by an official final canary
5. Supporting references:
   - CorePass deployment info: https://docs.corepass.net/corepass-connector/deployment-info/
   - CorePass authorization docs: https://docs.corepass.net/corepass-connector/authorization/
   - CorePass protocol: https://docs.corepass.net/corepass-protocol/
   - Core Blockchain `AB = testnet`, `CB = mainnet`: https://github.com/core-coin/go-core
   - `network id 3 = Devin`: https://github.com/core-coin/wallet-generator/blob/master/main.go

## 2.4 Optional Pilot Fallback
1. If CorePass testnet remains unavailable and preserving the official contract history matters, the project may insert a separate self-only mainnet pilot before the official launch.
2. That pilot is optional fallback, not the default launch path.
3. The pilot should keep mint/security/randomness logic as close as possible to the official CoreCats contract.
4. The pilot must remain clearly distinguishable from the official release in human-facing labels and documentation.
5. Pilot success does not remove the need for an official final canary on the real CoreCats contract.
6. See `docs/MAINNET_PILOT_FALLBACK.md` for the exact conditions and constraints.
7. If chosen, execute the operator steps from `docs/MAINNET_PILOT_DEPLOY_RUNBOOK.md`.

## 2.5 CorePass Scope For The Current Release
1. The current release target is the CorePass **Protocol-direct** path:
   - `corepass:sign`
   - `corepass:tx`
2. The current release target does **not** depend on Connector Authorization / KYC-transfer.
3. Therefore the current launch path should be planned around **XCB**, not CTN.
4. CTN should be revisited only if the project later adopts Connector-based Authorization / KYC-transfer for KYC-gated mint.
5. See `docs/COREPASS_PROTOCOL_AND_CONNECTOR_NOTES.md`.

## 3. Historical Note on Phase B / C
1. ADR-0001 recorded an earlier fallback order: `A -> B -> C`.
2. That fallback order was useful while direct Core viability was still uncertain.
3. Direct Core implementation is now working on `main`.
4. Because of that, Phase B and Phase C are no longer part of the active execution plan.
5. Keep ADR-0001 only as historical decision context unless a new hard blocker appears and is documented.

## 4. Current Execution Path

### 4.1 Step 1: Mainnet Readiness
Objective:
Prepare the final repository, contracts, web app, and operations model for a safe mainnet launch.

Tasks:
1. Freeze the final 1000-art provenance inputs and keep manifest-based reproducibility artifacts current.
2. Finalize production key separation:
   - deployer
   - mint signer
   - finalizer/relayer
3. Prepare mainnet deploy and verify inputs:
   - constructor args
   - standard input JSON
   - expected addresses/logging slots
4. Decide and document launch states for the web app:
   - `closed`
   - `canary`
   - `public`
5. Replace temporary in-memory CorePass session handling with a durable production store before any mainnet mint.
6. Finalize public domain, callback URLs, explorer base URLs, and contract-address injection points for `web/`.
7. Decide quantity exposure policy for day-one launch:
   - if `1 / 2 / 3` will all be exposed immediately, canary must validate more than a single-quantity flow
   - otherwise temporarily constrain the public UI to `1` until multi-quantity is confirmed
8. Decide launch path:
   - default official-contract canary, or
   - optional self-only pilot fallback, then official final canary
9. If pilot fallback is chosen, prepare pilot-specific labeling/configuration work without changing core mint/security logic.

Exit criteria:
1. Production env model is defined.
2. Durable session storage plan is implemented or scheduled as the immediate next code task before canary.
3. Web launch-state behavior is specified.
4. Mainnet deploy/verify inputs are assembled.
5. Launch path selection is explicit.

### 4.2 Step 2: Web Publication Before Mint Opening
Objective:
Publish the public-facing site before public mint is opened.

Tasks:
1. Publish `/`, `/about`, `/collection`, and `/transparency`.
2. Keep `/mint` visible but logically closed.
3. Make launch state explicit on the site:
   - `closed`: public can inspect, but mint is not open
   - `canary`: live testing is happening for a restricted operator set
   - `public`: mint is open
4. Ensure the site can be updated with mainnet contract addresses without changing the mint flow structure.
5. Keep GitHub, manifest, and transparency links live before mint opens.
6. Follow `docs/WEB_PUBLICATION_POLICY.md` for teaser/publication constraints, including stable origin and teaser-facing logo-art handling.

Exit criteria:
1. Website is publicly reachable.
2. Mint is clearly not open to the public yet.
3. Production callback/app-link URLs are final.

### 4.3 Step 3: Mainnet Closed Launch
Objective:
Deploy on mainnet without opening public mint.

Tasks:
1. Deploy `CoreCatsOnchainData`, `CoreCatsMetadataRenderer`, and `CoreCats`.
2. Record deploy transactions, addresses, env selections, and runbook evidence.
3. Attempt explorer verification on mainnet.
   - use public API if available
   - otherwise use the prepared manual verify packet path
4. Update the public site with the real mainnet contract addresses.
5. Keep launch state at `closed`.
6. Keep signature issuance restricted.
   - no general public signing
   - only operator-controlled allowlist if needed for canary

Exit criteria:
1. Mainnet contracts exist and are recorded.
2. Public site points to the correct mainnet addresses.
3. Public mint is still effectively closed.

### 4.4 Step 4: Canary Validation
Objective:
Run a controlled live mint on mainnet before public opening.

Tasks:
1. Allow only the intended operator wallet(s) to request signatures.
2. Perform the first live canary mint through the intended production flow.
   - preferred path: CorePass sign -> CorePass commit tx -> relayer finalize, with any manual/operator recovery kept internal-only
3. Confirm end-to-end behavior:
   - CorePass callback/app-link behavior
   - commit tx visibility
   - finalize tx visibility
   - token assignment
   - on-chain `tokenURI`
   - website/explorer links
4. Record the canary result in a worklog.
5. If public day-one UI will expose quantity `2 / 3`, validate that quantity path before switching to `public`.
   - if not yet validated, leave public UI at quantity `1` until it is

Exit criteria:
1. At least one full mainnet canary mint succeeds.
2. The intended public mint flow is proven with the real wallet path.
3. Quantity exposure policy is honest relative to what has actually been validated.

### 4.5 Step 5: Public Launch
Objective:
Open mint to the public after canary success.

Tasks:
1. Change launch state from `closed` or `canary` to `public`.
2. Enable general signature issuance with rate limits and nonce/expiry enforcement.
3. Keep finalize monitoring active.
4. Publish the mainnet contract addresses, verify links or manual-verify status, and reproducibility artifacts.
5. Execute the repository-clarity pass for public readers:
   - `core-cats` remains the only production-facing implementation repository
   - `core-cats-eth` is presented only as a historical archive
   - public navigation should not make the archive look like a second current mint path
6. Monitor:
   - mint success rate
   - finalize backlog
   - session failures
   - explorer visibility

Exit criteria:
1. Public mint is open on the intended path.
2. Transparency artifacts are published.
3. Operational monitoring is in place.
4. Repository roles are unambiguous to outside readers.

## 5. Immediate Next Actions From The Current State
1. Keep the public site on Vercel in `closed` mode while finishing the separate Contabo mint backend path documented in `docs/MINT_BACKEND_ARCHITECTURE.md`.
2. Stage the production signing/finalization material on the backend host and keep deployer material off the backend until the actual deploy window.
3. Replace the temporary in-memory CorePass mint session store with SQLite on the backend before the first real mainnet canary.
4. Execute the official mainnet closed deploy sequence and record deploy/verify evidence.
5. Decide day-one quantity exposure:
   - all `1 / 2 / 3`, or
   - temporary `1`-only until mainnet multi-quantity canary is complete
6. Before switching to `public`, perform the release-clarity pass for `core-cats-eth`:
   - all active launch docs live in `core-cats`
   - `core-cats-eth` top-level messaging is archive-only
   - no public-facing copy implies two active repositories

## 6. Runbooks and Evidence
1. Testnet rehearsal and verification notes:
   - `docs/CORE_TESTNET_DEPLOY_RUNBOOK.md`
   - `docs/verify_inputs/devin/`
2. Mainnet closed-launch operations:
   - `docs/MAINNET_CLOSED_LAUNCH_RUNBOOK.md`
3. Optional pilot fallback:
   - `docs/MAINNET_PILOT_FALLBACK.md`
4. Web publication policy:
   - `docs/WEB_PUBLICATION_POLICY.md`
5. Mint backend architecture:
   - `docs/MINT_BACKEND_ARCHITECTURE.md`
6. Worklog requirement:
   - every major step must write a short note in `docs/worklogs/`
   - include command summary, result, and next action
7. Direct Contabo runtime changes:
   - after any direct change on the Contabo host, refresh the timestamped live-state snapshot in `.private/core-cats-mainnet-ops.md`
   - record the active commit SHA, service state, backend origin, `healthz` summary, wallet staging state, and current blockers
