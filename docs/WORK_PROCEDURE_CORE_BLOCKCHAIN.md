# Core Cats Work Procedure (Core-First, A -> B -> C)

Last updated: 2026-03-05  
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
5. Random assignment policy: `commit-reveal + future blockhash + lazy Fisher-Yates`.

## 2. Current Baseline
1. Final 1000 manifest and trait schema are fixed in repository artifacts.
2. Renderer/reference behavior exists and has parity checks (manifest and pixel checks).
3. Active implementation repository is `core-cats`.
4. `core-cats-eth` is reference/archive only.

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
2. Execute first controlled mint.
3. Publish contract addresses, verification links, and reproducibility artifacts.
4. Tag release commit and freeze public release notes.

## 8. Worklog Requirement (For Cross-Session Handoff)
For every major step, commit a short machine-readable note including:
1. current phase (`A`, `B`, or `C`)
2. command summary
3. result (`success` or `blocked`)
4. next action

Recommended location: `docs/worklogs/`.
