# CCATTEST Rehearsal Canary Plan (v2)

Status: Draft for the current `main` branch

Current recovery posture:
1. the prior public-origin rehearsal is paused while publication/resource hardening is completed
2. public teaser/browse reopening and canary mint reopening are now treated as separate tasks
3. the next rehearsal restart may use a private operator-controlled canary origin while the community-facing teaser surface stays browse-only
4. the later public mint still targets the community-facing public site

## Purpose
Use the already-deployed mainnet `CCATTEST` contract as a rehearsal canary so the project can remove mint, finalize, UI, recovery, and transparency defects before the official `CCAT` contract is deployed.

This plan is intentionally narrower than the full launch runbook:
1. maximize production-like validation before the official contract exists
2. reduce the surface area that still has to be proven in the later official contract canary
3. keep the public repository explicit about what has and has not been proven

## Naming
Use the following terms consistently:

1. `CCATTEST rehearsal canary`
   - the intended production-like `/mint` UI is used
   - the configured mainnet contract is still the rehearsal contract `CCATTEST`
   - this may temporarily run on a private operator-controlled canary origin during recovery work
2. `official CCAT canary`
   - the intended production-like `/mint` UI is used
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
   - if the real `/mint` UI needs to be tested, switch the active canary surface to `canary`
3. Durable session storage is already implemented.
   - the remaining work is to verify restart and recovery behavior, not to redesign storage from scratch
4. Wallet-limit refusal already exists in the backend path.
   - the current expectation is "identify may complete, but the backend rejects before a gas-spending commit transaction is prepared"
5. Session continuation is currently `sessionId`-based.
   - same-page reload during finalize pending can be tested as internal recovery behavior
   - do not treat fresh-open session history as a required public UX promise
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
For the production-like UI rehearsal, the active canary surface should be configured as follows:

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
12. Contabo may set `CORECATS_CANARY_ALLOWED_CORE_IDS` during the rehearsal canary so only named test wallets can receive commit authorization

If the community-facing teaser site is intentionally kept in `closed`, that surface should be limited to browse/public checks. It should not be treated as the real rehearsal canary.

### A-3. Fallback and env drift checks
1. Confirm no important public surface still falls back to Devin/testnet values.
2. Stage `.env.production.local` and run the production env check script before redeploy.
3. Confirm `/mint`, `/transparency`, explorer links, and chain labels all point at mainnet `CCATTEST`.

### A-4. Evidence format
For each rehearsal-canary test, record at minimum:

1. wallet label
2. quantity
3. QR1 path
4. QR2 path
5. how far it progressed
6. any visible error text
7. commit tx hash if any
8. finalize tx hash if any
9. final result
10. UX observations
11. session id
12. any extra evidence needed for that case:
   - UI screenshot
   - assigned token id if known
   - `tokenURI` readback result
   - relevant backend log or health observation

## Phase B: Finish the Mint-Critical UI

### B-1. Launch-state semantics
1. Keep the existing state meanings explicit:
   - `closed`: public site visible, mint not live
   - `canary`: mint open only for validation
   - `public`: general mint open
2. Do not hide a real mint workflow behind `closed`.
3. Use `canary` for the production-like `/mint` rehearsal.
4. If the rehearsal must stay limited to selected wallets, enforce that at the backend authorization layer rather than through hidden URLs.

### B-2. Mint session copy
The UI should make these phases easy to distinguish:

1. session created
2. wallet confirmed
3. commit still needs approval
4. commit confirmed
5. finalize pending
6. finalize sent by relayer
7. finalize taking longer than expected, with clear wait/retry guidance
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
5. for rehearsal planning, `device standard camera` versus `CorePass in-app QR scanner` refers to the `QR 1 of 2` entry path unless a test explicitly says otherwise
6. unless a test explicitly says otherwise, `QR 2 of 2` should continue inside CorePass after `QR 1 of 2`
7. still keep one dedicated smoke test that uses the device standard camera for `QR 2 of 2`

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
4. the public UI keeps the finalize guidance simple:
   - wait on the current page while status updates
   - do not start a new mint or reuse an earlier QR within `30` minutes
   - if the NFT still has not arrived after `30` minutes, start a new mint from the beginning
5. any manual/operator finalize path remains internal-only and is not required as a public UI element
6. stuck sessions become visible through backend health or logs

## Phase D: Run the CCATTEST Rehearsal Canary Matrix

### D-1. Baseline evidence already on record
One mainnet `CCATTEST` mint already succeeded via a self-only pilot path using a Codex-generated CorePass QR and the device standard camera.

That evidence remains valuable, but it does not count as proof of the real public `/mint` rehearsal path.

### D-1a. Current matrix status update
The following checkpoint is already complete and should not be re-consumed by accident during the remaining Wallet A block:

1. `LT-01`
   - passed on `2026-03-12`
   - confirmed through the private canary origin with a real Wallet A quantity-`1` success
   - private-canary host migration smoke also passed on the same run
   - the next functional Wallet A step is now `LT-02`

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
   - reserved first for recovery and restart tests
   - if minimizing wallet switching matters, Wallet D may also be used for the remaining quantity-`1` generic-wallet success checks until it reaches the cap
5. Wallet E
   - optional extra generic-wallet confirmation wallet
   - not required if Wallet D still has enough headroom and the operator prefers to avoid wallet switching

### D-3. Success-path mint tests
Run these from the real public `/mint` UI while the site is in `canary`.

1. `SC-01`
   - wallet label: `Wallet B`
   - quantity: `1`
   - QR1 path: `device standard camera`
   - QR2 path: `continue inside CorePass`
   - target: baseline desktop-first success path
2. `SC-02`
   - wallet label: `Wallet D`, or `Wallet B` / `Wallet C` only if a separate generic-wallet success run is preferred
   - quantity: `1`
   - QR1 path: `CorePass in-app QR scanner`
   - QR2 path: `continue inside CorePass`
   - target: in-app scanner success path
3. `SC-03`
   - wallet label: `Wallet B`
   - quantity: `2`
   - QR1 path: `device standard camera`
   - QR2 path: `continue inside CorePass`
   - target: multi-quantity success for quantity `2`
4. `SC-04`
   - wallet label: `Wallet C`
   - quantity: `3`
   - QR1 path: `device standard camera`
   - QR2 path: `continue inside CorePass`
   - target: multi-quantity success for quantity `3`
5. `SC-05`
   - wallet label: `Wallet D`, or `Wallet E` only if preserving Wallet D headroom is more important than minimizing wallet switching
   - quantity: `1`
   - QR1 path: `device standard camera`
   - QR2 path: `device standard camera`
   - target: one-time smoke test that `QR 2 of 2` transaction handoff also works when reopened through the device standard camera instead of staying inside CorePass

### D-4. Limit and refusal tests
1. `LT-01`
   - wallet label: `Wallet A`
   - quantity: `1`
   - QR1 path: `device standard camera`
   - QR2 path: `continue inside CorePass`
   - target: mint one more cat and reach cumulative `2`
2. `LT-02`
   - wallet label: `Wallet A`
   - quantity: `2` or `3`
   - QR1 path: `device standard camera`
   - QR2 path: `not prepared`
   - target: after Wallet A reaches cumulative `2`, confirm backend/UI refusal before any gas-spending commit transaction is prepared
3. `LT-03`
   - wallet label: `Wallet A`
   - quantity: `1`
   - QR1 path: `device standard camera`
   - QR2 path: `continue inside CorePass`
   - target: mint one more cat and reach cumulative `3`
   - status: complete on `2026-03-13`
   - note: this run closed the recovered private canary bridge-polling and host-path smoke checks
   - note: `QR 1 of 2 -> QR 2 of 2` advanced without a manual reload
   - note: `QR 2 of 2 -> Step 3` advanced without a manual reload
   - note: the callback/success path stayed on the private canary origin and did not jump to the public teaser origin or any localhost/internal host
   - note: the remaining host-specific mint proof before public launch can now be limited to one final exact-host smoke mint on the future public-mint origin
4. `LT-04`
   - wallet label: `Wallet A`
   - quantity: `1`
   - QR1 path: `device standard camera`
   - QR2 path: `not prepared`
   - target: confirm another mint is refused before a gas-spending commit transaction is prepared once Wallet A is full
   - status: complete on `2026-03-13`
   - note: the refusal appears before `QR 2 of 2` is prepared and uses the cumulative wallet-limit wording

### D-5. Finalize and recovery tests
1. `FR-01`
   - wallet label: any successful canary wallet
   - quantity: `1`
   - QR1 path: `device standard camera`
   - QR2 path: `continue inside CorePass`
   - target: confirm one normal relayer finalize success from the rehearsal-canary UI path
2. `FR-02`
   - wallet label: `Wallet D`
   - quantity: `1`
   - QR1 path: `device standard camera`
   - QR2 path: `continue inside CorePass`
   - operator action: force or simulate a relayer problem after commit confirmation
   - target: confirm the UI distinguishes `commit confirmed`, `finalize pending`, and the `30`-minute wait / retry guidance
   - target: confirm no public manual-finalize QR is required for that UX
3. `FR-03`
   - wallet label: `Wallet D`
   - quantity: `1`
   - QR1 path: `device standard camera`
   - QR2 path: `continue inside CorePass`
   - operator action: after commit and before finalize completes, reload the current page
   - target: confirm the session can continue to finalize completion
   - note: same-`sessionId` reopen may still be probed as internal recovery behavior, but it is not a public UX promise
4. `FR-04`
   - wallet label: `Wallet D`
   - quantity: `1`
   - QR1 path: `device standard camera`
   - QR2 path: `continue inside CorePass`
   - operator action: exercise duplicate callback or near-duplicate finalize handling
   - target: confirm the session remains coherent and does not regress
   - note: do not combine this with same-device mobile mint testing; if mobile same-device is explored later, run it as a separate follow-on matrix so duplicate-event handling and mobile app-link/browser-return issues stay distinguishable

### D-6. Ownership, transparency, and metadata tests
1. `OT-01`
   - wallet label: `Wallet A`
   - target: `My Cats` is correct after Wallet A reaches cumulative `2`
2. `OT-02`
   - wallet label: `Wallet A`
   - target: `My Cats` is correct after Wallet A reaches cumulative `3`
3. `OT-03`
   - wallet label: `Wallet B` and `Wallet C`
   - target: `My Cats` is correct after the quantity `2` and quantity `3` mints
4. `OT-04`
   - wallet label: any successful canary wallet
   - target: `My Cats` remains correct after page reload
5. `OT-05`
   - wallet label: any successful canary wallet
   - target: mint completion leads naturally to `My Cats`, explorer, and transparency
6. `OT-06`
   - target: `/transparency` points at the correct `CCATTEST` contract, explorer, and repository docs
7. `OT-07`
   - wallet label: any minted rehearsal wallet
   - target: `tokenURI(tokenId)` decodes to on-chain JSON/Base64 SVG for the minted rehearsal token ids
   - evidence path:
     - `python3 scripts/read_live_token_evidence.py --rpc-url "$CORE_MAINNET_RPC_URL" --contract-address "$CORECATS_ADDRESS" --finalize-tx "<finalize-tx-hash>"`
     - or `--owner-address "<wallet-address>"` if the finalize tx is not at hand

### D-7. Operational behavior tests
1. `OP-01`
   - wallet label: `Wallet D`
   - quantity: `1`
   - QR1 path: `device standard camera`
   - QR2 path: `not reached`
   - operator action: create the session, restart the backend, then confirm the session is still readable and usable
2. `OP-02`
   - wallet label: `Wallet D`
   - quantity: `1`
   - QR1 path: `device standard camera`
   - QR2 path: `continue inside CorePass`
   - operator action: restart the backend after commit confirmation and before finalize completes
   - target: recovery still succeeds
3. `OP-03`
   - wallet label: `Wallet D`
   - quantity: `1`
   - QR1 path: `device standard camera`
   - QR2 path: `not reached` or `expired before approval`
   - target: expired session or expired authorization is surfaced clearly to the user
4. `OP-04`
   - target: `closed`, `canary`, and `public` launch-state switches match what the site actually allows
   - note: while the temporary split is active, this also includes `public teaser = browse only` and `private canary = mint live`

### D-8. Optional ownership-follow test
1. `OF-01`
   - transfer a minted `CCATTEST` token to another wallet
   - confirm `My Cats` follows the ownership change after the status cache refreshes
   - status: complete on `2026-03-13`

This is not a minimum mint gate, but it is high-value if `My Cats` is presented as a real ownership page.

### D-9. Recommended Execution Order When Minimizing Wallet Switching
If the operator wants to avoid re-entering seed phrases and switching wallets repeatedly, run the remaining tests in this order.

1. Wallet D block: do all Wallet D tests first while it still has headroom.
   - `OP-01`
     - quantity: `1`
     - QR1 path: `device standard camera`
     - QR2 path: `not reached`
     - note: create the session, restart the backend, and confirm the session is still usable before spending gas
   - `OP-03`
     - quantity: `1`
     - QR1 path: `device standard camera`
     - QR2 path: `not reached` or `expired before approval`
     - note: confirm expired session or expired authorization messaging without consuming another mint slot
   - `FR-02`
     - quantity: `1`
     - QR1 path: `device standard camera`
     - QR2 path: `continue inside CorePass`
     - note: induce the relayer problem here, before Wallet D is full
     - if preserving Wallet D mint headroom is important, keep relayer recovery disabled long enough to observe the UI and let the session expire instead of completing finalize
   - `SC-05` plus `FR-04`
     - quantity: `1`
     - QR1 path: `device standard camera`
     - QR2 path: `device standard camera`
     - note: use this run as the one-time `QR 2 of 2` standard-camera smoke and, if practical, piggyback the duplicate-callback or near-duplicate-finalize handling check on the same session
   - `SC-02`
     - quantity: `1`
     - QR1 path: `CorePass in-app QR scanner`
     - QR2 path: `continue inside CorePass`
     - note: this should be the last planned successful Wallet D mint so Wallet D reaches its cap only after the D-specific checks are finished

2. Wallet C block:
   - `SC-04`
     - quantity: `3`
     - QR1 path: `device standard camera`
     - QR2 path: `continue inside CorePass`
     - note: this closes the quantity-`3` success proof in one switch

3. Wallet A block:
   - `LT-01`
     - already complete; do not spend another Wallet A mint here
   - `LT-02`
     - quantity: `2` or `3`
     - QR1 path: `device standard camera`
     - QR2 path: `not prepared`
   - `LT-03`
     - already complete; Wallet A should now be treated as cumulative `3`
   - `LT-04`
     - quantity: `1`
     - QR1 path: `device standard camera`
     - QR2 path: `not prepared`

4. Cross-wallet follow-up:
   - collect wallet-specific ownership/success evidence immediately after each successful mint instead of deferring all ownership checks to the end
   - use the final Wallet A block to close the checks that can be done from Wallet A without switching again
   - `OP-04`
   - `OF-01` if ownership-follow evidence is wanted

This order is chosen to:
1. spend the least time switching wallets
2. use Wallet D for all D-specific recovery checks before its remaining mint headroom is consumed
3. avoid returning to Wallet B, because Wallet B already has quantity-`1` and quantity-`2` success evidence

### D-10. Ownership Check Timing When Minimizing Wallet Switching
Do not leave every ownership/transparency check to one final pass. Split them by when they are cheapest to collect.

1. Collect immediately after each successful mint, while still on that wallet:
   - `OT-03`
     - for Wallet B and Wallet C, confirm `My Cats` reflects the quantity-`2` and quantity-`3` mint results
   - `OT-05`
     - from each successful mint completion state, confirm the handoff to `My Cats`, explorer, and transparency
   - `OT-07`
     - record the minted token ids and `tokenURI` evidence tied to that wallet's successful mint

2. Leave for the final Wallet A block:
   - `OT-01`
     - confirm `My Cats` is correct after Wallet A reaches cumulative `2`
   - `OT-02`
     - confirm `My Cats` is correct after Wallet A reaches cumulative `3`
   - `OT-04`
     - confirm `My Cats` remains correct after page reload
   - `OT-06`
     - confirm `/transparency` points at the correct `CCATTEST` contract, explorer, and repository docs
   - `OP-04`
     - confirm `closed`, `canary`, and `public` launch-state switches match what the site actually allows

This split keeps the plan aligned with the practical wallet-switch-minimizing workflow:
1. collect wallet-specific success evidence while that wallet is already active
2. avoid switching back into old wallets just to re-open pages that were already available during the successful mint
3. finish with the checks that can still be closed cleanly from Wallet A

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
4. `My Cats`
5. transparency
6. session recovery
7. restart resilience
8. over-limit refusal before gas-spending commit
9. tokenURI and explorer consistency
10. finalize-waiting copy and `30`-minute retry guidance

Reserve these for the later official `CCAT` canary:

1. official contract address and signing-domain wiring
2. final env replacement accuracy
3. one full mint success on the official contract

### F-3. Optional same-device mobile evaluation is a separate track
If same-device mobile mint is explored at all, treat it as a separate follow-on track after the `CCATTEST rehearsal canary`, not as part of `FR-04`.

1. keep the release primary path desktop-first unless the separate mobile matrix proves otherwise
2. use fresh wallets for the mobile matrix
3. if `FR-04` is still needed, spend one fresh-wallet mint on that duplicate-event test first, then use separate fresh-wallet runs for mobile same-device evaluation
4. if mobile same-device succeeds, disclose it only as a secondary supported path until the final public-mint host has also proven it
5. if mobile same-device does not prove cleanly, keep the release path desktop-first and do not block the launch on it

### F-4. Official CCAT release sequence after the rehearsal closes
After the `CCATTEST rehearsal canary` is closed:

1. optionally finish the separate same-device mobile matrix
2. if a CorePass KYC zero-knowledge release appears in time, evaluate it as a separate addition; otherwise keep the current mint path and do not block the release on that feature
3. finalize the official `CCAT` super-rare decision:
   - use the approved logo individuals if permission arrives in time, or
   - replace them with newly prepared super-rare individuals
4. deploy the official `CCAT` contract
5. run one exact-host smoke mint on the final public-mint origin:
   - final host: the intended Vercel Pro public-mint origin
   - prove `QR 1`, `QR 2`, callback return, Step `3`, finalize, `My Cats`, and transparency/explorer links on that exact host/origin
6. open the later public mint only after that exact-host smoke succeeds

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
5. the public UI clearly distinguishes `commit confirmed`, `finalize pending`, and `completed`
6. the public finalize copy tells users not to restart minting or reuse earlier QR codes within `30` minutes
7. the public finalize copy tells users to retry from the beginning only after `30` minutes if the NFT still has not arrived
8. `My Cats`, explorer links, transparency, and tokenURI evidence are all consistent
9. restart and session-recovery checks pass on the real proxy/backend path
10. no unresolved `P0` issues remain

## Out of Scope for This Rehearsal Gate
1. official `CCAT` mainnet deploy itself
2. wallet-address-only session resume
3. new web/backend rate-limiting features that do not already exist
4. non-mint-critical polish work such as donations or secondary marketing UI
