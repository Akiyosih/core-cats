# Core Cats Work Procedure (Core-First, A -> B -> C)

Last updated: 2026-03-06  
Version: v2.0

## 0. Non-negotiable Rules
1. Final target chain is Core Blockchain mainnet.
2. Execution order is fixed by ADR-0001: A -> B -> C.
3. Do not skip forward in the order unless blocker evidence is committed.
4. Keep NFT semantics stable across all paths.

## 1. Product Invariants (Must Not Change)
1. Total supply: 1000 fixed.
2. Mint policy: free mint, zero royalty.
3. Fully on-chain metadata and SVG (`tokenURI` returns data URI JSON/SVG).
4. Trait semantics match final manifest.
5. Random assignment policy: `commit-finalize + future blockhash + lazy Fisher-Yates`.

## 2. Current Baseline
1. Final 1000 manifest and trait schema are fixed in repository artifacts.
2. Renderer/reference behavior exists and has parity checks (manifest and pixel checks).
3. Active implementation repository is `core-cats`.
4. `core-cats-eth` is reference/archive only.
5. Core Devin testnet rehearsal deployment succeeded on 2026-03-05.
6. First mint succeeded (`tokenId=1`) and `tokenURI` was decoded to on-chain JSON/SVG.
7. Deployment + first mint fee stayed under 1 XAB total.

## 2.1 Checkpoint Snapshot (2026-03-05)
1. Deployed contracts:
   - `CoreCatsOnchainData`: `ab955ac6d28cfd8dd41fcae677dc8968c4b26e1f17b1`
   - `CoreCatsMetadataRenderer`: `ab46969ce93676eb4ff5a82e02a1c712f7d076ca1901`
   - `CoreCats`: `ab58e879a3b77a58dbd2a0016a2ee56a8b6352ccaec5`
2. Mint/readback:
   - `totalSupply = 1`
   - `ownerOf(1) = ab2619b646aaed439289a47f5f62168182dd1b1456da`
   - `tokenURI(1)` prefix: `data:application/json;base64,`
   - decoded metadata `image` prefix: `data:image/svg+xml;base64,`
3. Fees (Core Devin explorer):
   - deploy total: `0.007050933 XAB`
   - first mint: `0.000129074 XAB`
4. Evidence:
   - `docs/worklogs/2026-03-05-phase-a-005.md`
   - `docs/verify_inputs/devin/`
   - `art/review/devin_token1/` (local decode artifacts; not committed by default)

## 3. Phase A (Primary): CoreZeppelin Direct Implementation
### Objective
Compile/deploy production-shape contract on Core toolchain using CoreZeppelin-compatible library line.

### Tasks
1. Create Core testnet compatibility branch from current stable baseline.
2. Replace/align imports to CoreZeppelin-compatible packages.
3. Resolve pragma/compiler settings for Core toolchain.
4. Build and run tests for:
   - supply and wallet limits
   - mint quantity handling (1/2/3)
   - signature checks (if enabled)
   - deterministic `tokenURI` behavior
   - random assignment replay checks
5. Deploy to Core testnet and execute end-to-end mint rehearsal.
6. Verify contract on Core ecosystem explorer.

### Exit Criteria (A success)
1. Compile passes on Core toolchain.
2. Core testnet deploy + mint + `tokenURI` checks pass.
3. Verification and reproducibility docs are complete.

### Current A Status
1. `A-1` compile/test/deploy/mint/tokenURI checks: done.
2. Explorer verify flow:
   - automated public endpoint attempts performed on Core Devin
   - current public explorer endpoints do not appear to expose a usable verification API
   - manual verify packet prepared; manual submission still pending
3. Random assignment (`commit-finalize + future blockhash + lazy Fisher-Yates`): implemented and re-rehearsed on Core Devin.
4. Quantity mint interface (`1/2/3` selection path): implemented as `commitMint + finalizeMint`; Core Devin rehearsal for quantity `1` succeeded.

## 2.2 Checkpoint Snapshot (2026-03-06)
1. Re-rehearsal deployment:
   - `CoreCatsOnchainData`: `ab61bc332a3cafa28c5359587c438f087d99a24938b9`
   - `CoreCatsMetadataRenderer`: `ab6204d634c05880e35ea2c9c7cb03c9aa0a87f5c510`
   - `CoreCats`: `ab597892bace5d97cf2fffa9a6eb0d5664b54a4b39ba`
2. Commit/finalize result:
   - deploy txs: `0xa24773c70deb0d706e3202583991e5110c7eae51529221e3bb5c2dcd9f2b7959`, `0xb1e08f207d68afb31dcc551119c99492bc77e905586b939b447dc73e3243b2cd`, `0x4f037b590a133f6e4c54de50f805d7c2485ef7bf192c7855fc2f012cbac0cb60`, `0xe8ff9dca18cf56f5c9de5cf9f2cc364a18898625a6d6c8894748ddd0684cf0fc`
   - commit tx: `0x96d4d0c304df9bf7b912888859c03833dc2ed5dd0e69bb189d8afcbd6938b182`
   - finalize tx: `0xe47050c84f3f8ce7e00ade68848a5cca4a01d3784d11fb3943b075ac1bb5d262`
   - assigned token: `#492`
3. Readback:
   - `totalSupply = 1`
   - `availableSupply = 999`
   - `reservedSupply = 0`
   - decoded `tokenURI(492)` confirmed on-chain JSON/SVG
4. Operational notes:
   - signer mode for this rehearsal: deployer
   - finalize was broadcast with `--energy-estimate-multiplier 250`
   - assigned token `#492` decoded to `tortoiseshell / orange_white / without_collar / common`

## 2.3 External Wallet Dependency Snapshot (2026-03-06)
1. CorePass-first mint UX is implemented in `web/` using QR/app-link protocol requests.
2. Current local user environment exposes only a mainnet `cb...` CorePass account.
3. A Devin testnet `ab...` CorePass account is not currently available in that environment.
4. Therefore:
   - Core Devin contract/randomness/relayer validation is still valid
   - CorePass mobile/desktop E2E on Devin remains pending
5. Operational consequence:
   - do not block remaining contract/UI work on CorePass testnet uncertainty
   - keep CorePass as the production-target mint UX
   - treat first real CorePass transaction validation as either:
     - a confirmed testnet-capable CorePass path, or
     - a controlled mainnet canary launch
6. Supporting references:
   - CorePass deployment info: https://docs.corepass.net/corepass-connector/deployment-info/
   - CorePass authorization docs: https://docs.corepass.net/corepass-connector/authorization/
   - CorePass protocol: https://docs.corepass.net/corepass-protocol/
   - Core Blockchain `AB = testnet`, `CB = mainnet`: https://github.com/core-coin/go-core
   - `network id 3 = Devin`: https://github.com/core-coin/wallet-generator/blob/master/main.go
   - TestFlight builds expire after 90 days: https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview

### A Blocker Criteria (required to move A -> B)
1. Reproducible compiler/runtime incompatibility that cannot be resolved with acceptable code changes.
2. Evidence committed (command logs, error signatures, attempted fixes).

## 4. Phase B (Fallback-1): External solc Operation
### Objective
Preserve Phase A semantics while replacing compile path with external compatible `solc`.

### Tasks
1. Lock external `solc` version and record checksum/source.
2. Compile contracts with external `solc` and persist artifacts deterministically.
3. Adapt deploy/verify pipeline for Core testnet using produced artifacts.
4. Re-run full behavioral parity checks against Phase A expectations.

### Exit Criteria (B success)
1. Core testnet deploy/verify/mint flow succeeds with external-compiled artifacts.
2. No semantic drift in tokenURI/traits/random assignment.
3. Reproducible build steps documented.

### B Blocker Criteria (required to move B -> C)
1. Deploy/verify cannot be completed safely under B pipeline.
2. Evidence committed with failed commands, constraints, and why A semantics cannot be preserved via B.

## 5. Phase C (Fallback-2): Self-Implemented Minimal Core
### Objective
Ship a safe minimal ERC-721-compatible implementation without library dependency lock.

### Scope
1. Implement only required surface:
   - ownership and transfer core
   - mint limits
   - metadata/tokenURI
   - deterministic random assignment integration
2. Exclude optional complexity unless required for release policy.
3. Add explicit security checklist and focused tests before any testnet deploy.

### Exit Criteria (C success)
1. Core testnet deploy/verify/mint works.
2. Required invariants are preserved.
3. Review checklist and known limitations are documented.

## 6. Mainnet Readiness Gate (After A or B or C Success)
1. Provenance/freeze procedure finalized and rehearsed.
2. Immutable parameters locked and documented.
3. Incident response and operations checklist prepared.
4. Final deploy/verify runbook dry-run completed.

## 7. Mainnet Deployment
1. Deploy and verify on Core mainnet.
2. Keep public mint logically closed until first controlled validation is complete.
   - do not open general signature issuance yet
3. Execute first controlled canary mint with the intended production wallet flow.
4. Confirm:
   - CorePass/app-link/QR behavior
   - commit/finalize success
   - explorer visibility
   - tokenURI/on-chain SVG readback
5. Only after canary success:
   - open broader signature issuance
   - publish contract addresses, verification links, and reproducibility artifacts
6. Tag release commit and freeze public release notes.

## 8. Worklog Requirement (For Cross-Session Handoff)
For every major step, commit a short machine-readable note including:
1. current phase (`A`, `B`, or `C`)
2. command summary
3. result (`success` or `blocked`)
4. next action

Recommended location: `docs/worklogs/`.
