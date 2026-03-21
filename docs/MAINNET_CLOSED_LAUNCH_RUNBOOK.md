# Core Cats Mainnet Closed Launch Runbook

Status: Draft for the current `main` branch

## Purpose
Provide the operational sequence from "web is publicly reachable" to "mint is publicly open" without skipping a controlled mainnet canary.

## Path Selection
1. Default path:
   - use the official CoreCats contract for `closed -> canary -> public`
2. Optional fallback:
   - insert a separate self-only mainnet pilot before the official closed launch
   - then still run an official final canary on the real CoreCats contract

Use the fallback only under the conditions documented in `docs/MAINNET_PILOT_FALLBACK.md`.

## 1. Launch Model
The project should use three operational states for mint:

1. `closed`
   - website is public
   - collection/about/transparency are public
   - mint page is visible
   - public mint is not open yet
   - no hidden operator-only mint surface should exist under `closed`
2. `canary`
   - mainnet contracts are deployed
   - the exact public mint host is exercised with a deliberately small operational smoke
   - the contract itself remains permissionless
   - goal is validation, not public release
3. `public`
   - general public mint is open
   - the contract enforces the wallet limit directly on-chain

Website publication and mint opening are separate actions.

## 2. Preconditions
Before mainnet launch work begins:

1. `main` contains the intended production contracts and web app structure.
2. Final 1000 manifest and trait schema are frozen in repository artifacts.
3. Production roles are separated:
   - deployer key
   - finalizer/relayer key
4. Mainnet deploy inputs are prepared:
   - constructor args
   - verify packet
   - worklog template
   - official label pair locked as `CoreCats` / `CCAT`
5. CorePass callback/app-link base URL is fixed for the production site.
6. CorePass mint session storage is durable enough for real mainnet use.
7. If the optional pilot fallback is chosen, pilot-specific release labeling/configuration is prepared before deploy.

## 3. Web Publication Before Mint
Publish the public web app first.

Required site behavior:
1. `/`, `/about`, `/collection`, and `/transparency` are public.
2. `/mint` is public but clearly marked `closed`.
3. No public mint should be treated as live while `closed`.
4. Transparency page can show:
   - "mainnet deployment pending" before deploy
   - then switch to the real contract addresses after deploy

The point of this step is to stabilize:
1. domain
2. callback routes
3. CorePass QR/app-link behavior
4. public copy and transparency links

## 3A. Optional Self-Only Pilot Fallback
Use this section only if the project explicitly chooses the pilot fallback.

1. Deploy a separate pilot contract with logic as close as possible to the official CoreCats contract.
2. Keep the pilot self-only and clearly labeled as non-official.
3. Validate the real mainnet wallet flow there first:
   - CorePass login / wallet bind
   - CorePass commit tx
   - relayer finalize, with any manual/operator recovery kept internal-only
   - callback/app-link return behavior
   - `tokenURI` readback
4. Record pilot tx hashes, addresses, token ids, and decoded `tokenURI` evidence separately from the official release.
5. After pilot success, return to the official path below.

Pilot success reduces risk, but it does not replace the official final canary because the official contract address and signing domain still differ.

## 4. Mainnet Closed Launch Checklist
Run these steps in order.

1. Confirm launch state is `closed`.
2. Stage the official deploy defaults locally before any broadcast:
   - source `foxar/.env.mainnet-official.example`
   - keep `CORECATS_ALLOW_NONSTANDARD_LABELS=0`
   - keep `CORECATS_SUPERRARE_PLACEHOLDER=0`
   - keep the official labels as `CoreCats` / `CCAT`
   - keep the current no-logo beam superrare path fixed:
     - `manifests/superrare_beam_selection_v2.json`
     - `manifests/beam_token_reorder_v2.json`
   - do not silently enable pilot placeholder mode during the official deploy
3. Dry-run the deploy script without `--broadcast` first:
   - `spark script script/CoreCatsDeploy.s.sol:CoreCatsDeployScript --fork-url "$CORE_MAINNET_RPC_URL" --network-id 1 --wallet-network mainnet --keystore "$DEPLOYER_KEYSTORE_PATH" --password-file "$DEPLOYER_PASSWORD_FILE"`
   - use this to confirm the constructor inputs and mainnet label guard before the real deploy window
4. Keep the one-page replacement map at hand:
   - `docs/OFFICIAL_CCAT_CUTOVER_NOTE.md`
5. Deploy:
   - `CoreCatsOnchainData`
   - `CoreCatsMetadataRenderer`
   - `CoreCats`
   - for the official mainnet release, keep `CORECATS_COLLECTION_NAME=CoreCats` and `CORECATS_SYMBOL=CCAT`
   - `foxar/script/CoreCatsDeploy.s.sol` now rejects nonstandard mainnet labels unless `CORECATS_ALLOW_NONSTANDARD_LABELS=1` is set intentionally for a pilot-style deploy
6. Record:
   - deployer address
   - contract addresses
   - deployment tx hashes
   - commit SHA
7. Attempt explorer verification.
   - if automated verify works, record links
   - if not, submit or stage the manual verify packet
8. Update the public site with:
   - mainnet contract addresses
   - explorer links
   - verify status
   - the public evidence items listed in `docs/MAINNET_PUBLIC_EVIDENCE_CHECKLIST.md`
9. Confirm finalizer configuration and any backend session/finalize services are pointed at mainnet, not Devin.
10. Keep the public mint surface closed until the exact-host smoke is complete.

## 5. Canary Mint Checklist
This is the first real production-path mint.

### Minimum canary
1. Use one dedicated canary wallet operationally, even though the contract itself remains permissionless.
2. Start from the public production web app.
3. Run the intended wallet flow:
   - CorePass login / wallet bind
   - CorePass commit tx
   - relayer finalize, with any manual/operator recovery kept internal-only
4. Confirm:
   - callback/app-link returns correctly
   - commit tx is visible on explorer
   - finalize tx is visible on explorer
   - assigned token exists
   - `tokenURI(tokenId)` decodes to on-chain JSON/SVG
   - collection/transparency pages point at the correct mainnet data
5. Write a worklog with the canary result.

If the assigned token id is not obvious from the wallet/explorer view, use:

```bash
python3 scripts/read_live_token_evidence.py \
  --rpc-url "$CORE_MAINNET_RPC_URL" \
  --contract-address "<deployed-corecats-address>" \
  --owner-address "<canary-minter-address>"
```

If the finalize tx is already known, it can derive the minted token ids directly from the receipt:

```bash
python3 scripts/read_live_token_evidence.py \
  --rpc-url "$CORE_MAINNET_RPC_URL" \
  --contract-address "<deployed-corecats-address>" \
  --finalize-tx "<finalize-tx-hash>"
```

### Quantity policy
1. If the first public launch will expose quantity `1 / 2 / 3`, do not assume quantity `1` is enough.
2. Either:
   - run an additional canary for multi-quantity mint, or
   - temporarily expose only quantity `1` on the public site until multi-quantity is confirmed

## 6. Post-Pilot Release Requirements
Before the official canary/public launch, apply the lessons from any self-only pilot.

1. Remove any self-only wallet pinning such as `COREPASS_EXPECTED_CORE_ID`.
   - official canary/public launch must not depend on one operator wallet
2. Keep wallet-limit enforcement in the contract as the canonical rule.
   - the contract remains the final authority for quantity and cumulative per-address limits
   - backend/UI may still refuse obviously over-limit attempts before a gas-spending commit, but that is convenience rather than eligibility control
3. Run at least one generic-wallet canary after any self-only fallback is removed.
4. If the public UI exposes quantity `1 / 2 / 3`, run real canaries for each exposed quantity or temporarily hide unvalidated quantities.
5. Treat both QR entry paths as release checks:
   - device standard camera -> CorePass launch
   - CorePass in-app QR scanner
   - if either path is unsupported or unreliable, disclose that clearly in the live web UI before release
6. Keep finalize as a first-class production concern.
   - `commitMint(...)` success only proves that a pending commit was recorded
   - NFT delivery is complete only after `finalizeMint(minter)` succeeds
7. Production automation should therefore include:
   - relayer retry behavior
   - stuck-session monitoring/alerting
   - an internal operator/manual recovery path if needed, without requiring a public third-QR UX
   - UI copy that distinguishes `commit confirmed` from `finalize pending`
   - UI copy that tells users not to start a new mint or reuse earlier QR codes during the active finalize window
8. After mint success, provide a smoother ownership handoff:
   - CTA to `My Cats`
   - wallet-prefilled lookup when practical
   - clear contract/explorer copy surface in the success state
9. Non-critical product additions such as a support/donation link should stay outside the mint-critical path until mint reliability work is finished.

### CCATTEST rehearsal canary before the official CCAT canary
After a self-only pilot succeeds, the project may run a public-UI rehearsal against the mainnet `CCATTEST` contract before the official `CCAT` contract exists.

Rules for that stage:
1. use the real public `/mint` UI with `NEXT_PUBLIC_LAUNCH_STATE=canary`
2. keep the configured contract on the mainnet `CCATTEST` address for that rehearsal stage
3. keep `COREPASS_EXPECTED_CORE_ID` unset so the rehearsal remains generic-wallet
4. do not add a hidden operator-only mint UI under `closed`
5. still run a later official canary on the final `CCAT` contract after deploy

Detailed rehearsal scope and test matrix:
- `docs/CCATTEST_REHEARSAL_CANARY_PLAN.md`

## 7. Go / No-Go Rules
Move from `closed` to `canary` only if:
1. mainnet contracts are deployed
2. contract addresses are recorded
3. production site is reachable
4. finalizer/backend config is correct

Move from `canary` to `public` only if:
1. at least one full canary mint succeeds
2. the intended production wallet flow is proven
3. explorer and transparency links are correct
4. token readback is correct
5. quantity exposure matches what has actually been validated

Do not move to `public` if:
1. CorePass callback/app-link is unstable
2. finalize backlog is unresolved
3. the public mint path still depends on a retained signer/owner surface contrary to the intended official philosophy
4. site is still pointing at Devin/testnet data anywhere important

## 8. Public Launch Checklist
After canary success:

1. Change launch state to `public`.
2. Open the general public mint host.
3. Keep relayer/finalize monitoring active.
4. Publish:
   - contract addresses
   - verify links or verify status
   - GitHub repository links
   - reproducibility docs
   - the canary/smoke evidence listed in `docs/MAINNET_PUBLIC_EVIDENCE_CHECKLIST.md`
5. Perform the repository clarity pass:
   - `core-cats` is the production-facing repo
   - `core-cats-eth` is labeled as historical archive only
   - public readers are not routed into the archive as if it were an active mint repo

## 9. Evidence To Save
For closed launch and canary:

1. deploy tx hashes
2. contract addresses
3. canary commit tx hash
4. canary finalize tx hash
5. assigned token id
6. decoded `tokenURI` evidence
7. any verify submission link or packet path
8. a worklog entry in `docs/worklogs/`
