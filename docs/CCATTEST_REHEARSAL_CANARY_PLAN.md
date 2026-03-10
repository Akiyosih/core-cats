# CCATTEST Rehearsal Canary Plan (v2)

Status: Draft for the current `main` branch

## Purpose
Use the already-deployed mainnet `CCATTEST` contract as a rehearsal canary so the project can remove mint, finalize, UI, recovery, and transparency defects before the official `CCAT` contract is deployed.

This plan is intentionally narrower than the full launch runbook:
1. maximize production-like validation before the official contract exists
2. reduce the surface area that still has to be proven in the later official contract canary
3. keep the public repository explicit about what has and has not been proven

## Naming
Use the following terms consistently:

1. `CCATTEST rehearsal canary`
   - the public `web/` app is switched to `canary`
   - the real public `/mint` UI is used
   - the configured mainnet contract is still the rehearsal contract `CCATTEST`
2. `official CCAT canary`
   - the public `web/` app is switched to `canary`
   - the real public `/mint` UI is used
   - the configured mainnet contract is the later official `CCAT` deployment

The `CCATTEST rehearsal canary` is a risk-reduction stage. It does not replace the later official `CCAT` canary because the contract address and signing domain will still differ.

## Source References
1. Main launch sequence: `docs/MAINNET_CLOSED_LAUNCH_RUNBOOK.md`
2. Vercel-side cutover rules: `docs/VERCEL_MAINNET_CUTOVER_CHECKLIST.md`
3. Core Blockchain project surface: https://coreblockchain.net/
4. Foxar toolchain surface: https://foxar.dev/intro/

## Repo-Aligned Constraints
This plan is aligned to the current repository behavior and should not assume features that do not exist.

1. Do not reintroduce self-only wallet pinning such as `COREPASS_EXPECTED_CORE_ID` for the rehearsal canary.
   - generic-wallet behavior is already the target state
2. Do not add a hidden operator-only mint UI under `closed`.
   - `closed` should keep meaning "public site visible, mint path not live"
   - if the real `/mint` UI needs to be tested, switch to `canary`
3. Durable session storage is already implemented.
   - the remaining work is to verify restart and recovery behavior, not to redesign storage from scratch
4. Wallet-limit refusal already exists in the backend path.
   - the current expectation is "identify may complete, but the backend rejects before a gas-spending commit transaction is prepared"
5. Session continuation is currently `sessionId`-based.
   - page reload and new-tab continuation can be tested
   - wallet-address-only resume is not a current feature
6. `/my-cats` already exists as an address lookup page outside the `closed` state.
   - the remaining work is launch-state exposure, accuracy, and post-mint handoff
7. Rate limiting is not a current release gate for this rehearsal stage.
   - contract nonce/expiry semantics still apply
   - do not treat missing web/backend rate limiting as a blocker for the `CCATTEST rehearsal canary`

## Phase A: Lock the Rehearsal Canary Environment

### A-1. Branch discipline
1. Use a dedicated working branch for any code that is not already live.
2. Keep Vercel and Contabo environment flips as rollout actions after code and tests are ready.
3. Keep `main` as the deployment reference until the next rehearsal-canary redeploy is intentionally triggered.

### A-2. Rehearsal canary env target
For the real UI rehearsal, the public site should be configured as follows:

1. `NEXT_PUBLIC_CORE_CHAIN_ID=1`
2. `CORE_NETWORK_ID=1`
3. `CORE_NETWORK_NAME=mainnet`
4. `NEXT_PUBLIC_CORE_EXPLORER_BASE_URL=https://blockindex.net`
5. `NEXT_PUBLIC_CORECATS_ADDRESS=<mainnet-ccattest-address>`
6. `CORECATS_BACKEND_MODE=proxy`
7. `CORECATS_BACKEND_BASE_URL=<contabo-backend-origin>`
8. `CORECATS_BACKEND_SHARED_SECRET=<same-secret-as-contabo>`
9. `CORECATS_RELAYER_ENABLED=true`
10. `NEXT_PUBLIC_LAUNCH_STATE=canary` for the real `/mint` UI rehearsal
11. `COREPASS_EXPECTED_CORE_ID` must remain unset

If the site is intentionally kept in `closed`, that stage should be limited to terminal-side probes and non-UI checks. It should not be treated as the real rehearsal canary.

### A-3. Fallback and env drift checks
1. Confirm no important public surface still falls back to Devin/testnet values.
2. Stage `.env.production.local` and run the production env check script before redeploy.
3. Confirm `/mint`, `/transparency`, explorer links, and chain labels all point at mainnet `CCATTEST`.

### A-4. Evidence format
For each rehearsal-canary test, record at minimum:

1. wallet label
2. entry path
3. quantity
4. session id
5. commit tx hash
6. finalize tx hash
7. assigned token id if known
8. tokenURI readback result
9. UI screenshot
10. relevant backend log or health observation
11. pass/fail result
12. notes

## Phase B: Finish the Mint-Critical UI

### B-1. Launch-state semantics
1. Keep the existing state meanings explicit:
   - `closed`: public site visible, mint not live
   - `canary`: mint open only for validation
   - `public`: general mint open
2. Do not hide a real mint workflow behind `closed`.
3. Use `canary` for the production-like `/mint` rehearsal.

### B-2. Mint session copy
The UI should make these phases easy to distinguish:

1. session created
2. wallet confirmed
3. commit still needs approval
4. commit confirmed
5. finalize pending
6. finalize sent by relayer
7. manual finalize required or manual finalize available
8. mint completed after finalize

The critical rule is that "waiting" and "failed" must not look the same.

### B-3. Quantity UI
1. If the production UI will expose `1 / 2 / 3`, the rehearsal canary should prove `1 / 2 / 3`.
2. The UI may keep showing `1 / 2 / 3`, but the acceptance rule is still backend-driven:
   - over-limit requests must be rejected before a gas-spending commit transaction is prepared

### B-4. QR and transport guidance
The mint UI should explain the expected transport:

1. desktop: show QR and explain the device-camera handoff to CorePass
2. mobile: show the direct app-link path
3. if the CorePass in-app QR scanner is also supported, say so clearly
4. if any path is unreliable, disclose the limitation in the live UI before public launch

### B-5. Success state
The success state should surface:

1. commit tx link
2. finalize tx link
3. contract link
4. explorer surface
5. `My Cats` CTA
6. assigned token id if the app adds token-assignment lookup for the success state

If token id is not yet surfaced directly in the success state, the rehearsal canary should still record it from explorer or operator readback.

## Phase C: Verify the Backend and Session Recovery in Production-Like Shape

### C-1. Run the real topology
The intended rehearsal path is:

`browser -> Vercel -> Contabo backend -> SQLite / spark / RPC -> CCATTEST`

Local-only UI checks are still useful, but they do not replace the rehearsal canary.

### C-2. Durable session verification
Durable storage already exists. The rehearsal work is to prove it behaves correctly.

Verify at least:
1. session creation survives backend restart
2. callback-applied session state is still readable after restart
3. commit-confirmed sessions remain recoverable after restart
4. finalize worker continues from stored session state after restart

### C-3. Finalize production behavior
Verify the relayer path in production-like conditions:

1. normal auto-finalize succeeds
2. `too_early` is treated as waiting/retry, not terminal failure
3. temporary RPC or send failure moves back into retry
4. manual finalize fallback stays user-facing
5. stuck sessions become visible through backend health or logs

## Phase D: Run the CCATTEST Rehearsal Canary Matrix

### D-1. Baseline evidence already on record
One mainnet `CCATTEST` mint already succeeded via a self-only pilot path using a Codex-generated CorePass QR and the device standard camera.

That evidence remains valuable, but it does not count as proof of the real public `/mint` rehearsal path.

### D-2. Wallet labels for rehearsal
Use generic labels in public records:

1. Wallet A
   - already holds one `CCATTEST` token from the earlier pilot
   - used for cumulative-limit cases
2. Wallet B
   - fresh wallet for success-path quantity `1 / 2`
3. Wallet C
   - fresh wallet for success-path quantity `3`
4. Wallet D
   - reserved for manual-finalize and recovery tests
5. Wallet E
   - optional extra generic-wallet confirmation wallet

### D-3. Success-path mint tests
Run these from the real public `/mint` UI while the site is in `canary`.

1. `SC-01`
   - Wallet B
   - quantity `1`
   - device standard camera -> CorePass
   - full mint success
2. `SC-02`
   - Wallet B or C
   - quantity `1`
   - CorePass in-app QR scanner
   - full mint success
3. `SC-03`
   - Wallet B
   - quantity `2`
   - full mint success
4. `SC-04`
   - Wallet C
   - quantity `3`
   - full mint success

### D-4. Limit and refusal tests
1. `LT-01`
   - Wallet A mints one more cat and reaches cumulative `2`
2. `LT-02`
   - Wallet A at cumulative `2`
   - request quantity `2` or `3`
   - backend/UI refusal occurs before a gas-spending commit transaction is prepared
3. `LT-03`
   - Wallet A mints one more cat and reaches cumulative `3`
4. `LT-04`
   - Wallet A attempts another mint
   - the normal path is refused before a gas-spending commit transaction is prepared

### D-5. Finalize and recovery tests
1. `FR-01`
   - confirm one normal relayer finalize success from the rehearsal-canary UI path
2. `FR-02`
   - force or simulate a relayer problem
   - confirm the UI distinguishes `commit confirmed`, `finalize pending`, and manual finalize availability
   - recover through manual finalize
3. `FR-03`
   - after commit, reload or reopen the page with the same `sessionId`
   - confirm the session can continue to finalize completion
4. `FR-04`
   - exercise duplicate callback or near-duplicate finalize handling
   - confirm the session remains coherent and does not regress

### D-6. Ownership, transparency, and metadata tests
1. `OT-01`
   - `My Cats` is correct for Wallet A at cumulative `2`
2. `OT-02`
   - `My Cats` is correct for Wallet A at cumulative `3`
3. `OT-03`
   - `My Cats` is correct for Wallet B and Wallet C after multi-quantity mints
4. `OT-04`
   - `My Cats` remains correct after page reload
5. `OT-05`
   - mint completion leads naturally to `My Cats`, explorer, and transparency
6. `OT-06`
   - `/transparency` points at the correct `CCATTEST` contract, explorer, and repository docs
7. `OT-07`
   - `tokenURI(tokenId)` decodes to on-chain JSON/Base64 SVG for the minted rehearsal token ids

### D-7. Operational behavior tests
1. `OP-01`
   - session created
   - backend restarted
   - session still readable and usable
2. `OP-02`
   - commit confirmed
   - backend restarted before finalize completes
   - recovery still succeeds
3. `OP-03`
   - expired session or expired authorization is surfaced clearly to the user
4. `OP-04`
   - `closed`, `canary`, and `public` launch-state switches match what the site actually allows

### D-8. Optional ownership-follow test
1. `OF-01`
   - transfer a minted `CCATTEST` token to another wallet
   - confirm `My Cats` follows the ownership change after the status cache refreshes

This is not a minimum mint gate, but it is high-value if `My Cats` is presented as a real ownership page.

## Phase E: Fix, Re-Test, and Keep the Bug Bar Honest

### E-1. P0: do not proceed
Examples:
1. wrong network or wrong contract surface
2. finalize cannot complete
3. over-limit path still prepares a gas-spending commit transaction
4. `My Cats` is materially wrong
5. launch-state labels and actual behavior diverge

### E-2. P1: should be fixed before the official CCAT canary
Examples:
1. one QR path remains unreliable
2. session copy is still confusing
3. relayer status is hard to understand
4. callback return is unstable
5. success state or transparency links are too weak

### E-3. P2: can be deferred if clearly tracked
Examples:
1. visual polish
2. non-critical copy cleanup
3. landing-page refinement
4. minor layout issues

## Phase F: Prepare the Official CCAT Cutover Review

### F-1. One-page replacement map
Prepare a cutover note that lists:

1. `CCATTEST` address -> official `CCAT` address
2. launch state at first official deploy
3. callback origin and explorer base
4. signer/finalizer direction
5. transparency link replacements
6. any canary-only labels that must be removed

### F-2. Explicit line between rehearsal and official canary
Treat these as already proven if the rehearsal canary passes:

1. quantity `1 / 2 / 3`
2. QR entry paths
3. relayer finalize
4. manual finalize
5. `My Cats`
6. transparency
7. session recovery
8. restart resilience
9. over-limit refusal before gas-spending commit
10. tokenURI and explorer consistency

Reserve these for the later official `CCAT` canary:

1. official contract address and signing-domain wiring
2. final env replacement accuracy
3. one full mint success on the official contract

## Recommended Execution Order
1. lock the rehearsal-canary env target
2. finish the remaining mint-critical UI copy and success-state work
3. verify `My Cats` and transparency against the `CCATTEST` mainnet contract
4. verify durable session and finalize behavior on the real proxy/backend path
5. switch the public site to `canary` while still pointing at `CCATTEST`
6. run the rehearsal-canary smoke checks
7. run the full rehearsal-canary matrix
8. fix issues and re-test until `P0` is zero and `P1` is acceptably small
9. prepare the later official `CCAT` cutover review

## Done Conditions
The `CCATTEST rehearsal canary` can be treated as complete only if all of the following are true:

1. quantity `1 / 2 / 3` each have mainnet success evidence from the real `/mint` rehearsal path
2. both QR entry paths have evidence, or any unsupported path is clearly disclosed in the UI
3. Wallet A reaches cumulative `3`, and 4th-equivalent attempts are refused before a gas-spending commit transaction is prepared
4. normal relayer finalize succeeds
5. manual finalize recovery succeeds
6. the UI clearly distinguishes `commit confirmed`, `finalize pending`, and `completed`
7. `My Cats`, explorer links, transparency, and tokenURI evidence are all consistent
8. restart and session-recovery checks pass on the real proxy/backend path
9. no unresolved `P0` issues remain

## Out of Scope for This Rehearsal Gate
1. official `CCAT` mainnet deploy itself
2. wallet-address-only session resume
3. new web/backend rate-limiting features that do not already exist
4. non-mint-critical polish work such as donations or secondary marketing UI
