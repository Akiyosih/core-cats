# Core Cats Public Trust + Privacy Notes

Status: working public-facing note for the current live / rehearsal trust surface

## Purpose
This note explains the practical trust surface and privacy expectations of the current Core Cats release path.

It is meant to sit next to the art, manifest, and randomness disclosures so readers can judge the project from the outside.

Important distinction:
1. this note describes the current live, canary, or historical trust surface
2. the intended official `CCAT` philosophy is documented separately in `docs/OFFICIAL_CCAT_LAUNCH_PRINCIPLES.md`
3. if the two differ, this note should be read as disclosure of the current surface, not as the final official philosophy claim

## What Is Fixed On-Chain
These properties are part of the active `CoreCats` contract shape:

1. total supply is fixed at `1000`
2. per-address mint limit is fixed at `3`
3. token assignment uses `commit-finalize + future blockhash + lazy Fisher-Yates`
4. metadata is served as fully on-chain Base64 JSON + SVG through `tokenURI(...)`

Relevant references:
1. `foxar/src/CoreCats.sol`
2. `foxar/src/CoreCatsMetadataRenderer.sol`
3. `docs/WORK_PROCEDURE_CORE_BLOCKCHAIN.md`
4. `docs/FREEZE_AND_RENOUNCE_POLICY.md`

## Dependency And Toolchain Review Surface
Readers should not treat `foxar/src/CoreCats.sol` as the only source that matters.

The active contract workspace also depends on:

1. imported contract primitives such as `CRC721`, `Ownable`, and `EDDSA`
2. the pinned submodule path `foxar/lib/corezeppelin-contracts`
3. the Core-specific Ylem / Foxar / Spark toolchain used to build and deploy the contracts

Practical implication:

1. reviewing only the top-level contract file is not enough for a full outside review
2. imported dependency sources are part of the real contract surface
3. published explorer verification or a reproducible verify packet matters because it is the public bridge between this repository and the deployed bytecode

Relevant references:
1. `.gitmodules`
2. `foxar/spark.toml`
3. `docs/MINTER_SELF_REVIEW_CHECKLIST.md`
4. `docs/MAINNET_PUBLIC_EVIDENCE_CHECKLIST.md`

## What Is Still An Explicit Trust Surface
The current live / rehearsal release path is not fully trustless.

Important operator-controlled surfaces still exist:

1. the contract owner can call `setSigner(address)`  
   This changes which off-chain signer is allowed to issue mint authorizations.
2. the contract owner can call `lockSigner()`  
   This is the one-way action that permanently disables later signer rotation once launch stability is proven.
3. mint authorization is currently signature-gated  
   That means mint eligibility depends on the backend signer issuing a valid authorization for the contract.
4. the intended official contract fixes `metadataRenderer` in the constructor rather than rotating it after deploy  
   Outside readers should still verify the deployed source and constructor wiring on the explorer or from the published verify packet.
5. the preferred production flow includes a relayer/finalizer backend  
   This is operational convenience, not a hidden mint right, because `finalizeMint(minter)` remains permissionless and a manual CorePass fallback is kept in the UX.

Relevant references:
1. `foxar/src/CoreCats.sol`
2. `web/components/mint-workflow.jsx`
3. `docs/MAINNET_CLOSED_LAUNCH_RUNBOOK.md`
4. `docs/FREEZE_AND_RENOUNCE_POLICY.md`
5. `docs/MINTER_SELF_REVIEW_CHECKLIST.md`

## What The Current Backend Actually Does
The current production direction uses:

1. Vercel for the public website and CorePass callback/origin handling
2. Contabo for the privileged mint backend
3. SQLite for the first durable mint-session store

The backend currently owns:
1. durable session persistence
2. mint authorization issuance
3. relayer-assisted finalize execution

Relevant references:
1. `docs/MINT_BACKEND_ARCHITECTURE.md`
2. `docs/MINT_BACKEND_API.md`
3. `docs/CONTABO_MINT_BACKEND_RUNBOOK.md`

## What Session / Operational Data Exists In The Current Design
The current design is not a no-data mint path.

At the application layer, the backend can persist:

1. the mint session blob
2. issued mint authorizations
3. finalize-attempt history

The current session flow includes fields such as:

1. a session id
2. the resolved CoreID / minter address
3. commit/finalize transaction hashes
4. timestamps and step history used for operator debugging/recovery

Relevant references:
1. `web/lib/server/corepass-mint-sessions.js`
2. `mint-backend/corecats_mint_backend/storage.py`
3. `docs/MINT_BACKEND_API.md`
4. `docs/MINTER_PRIVACY_NOTE.md`

## Privacy Expectations
The current launch path should not be marketed as anonymous minting.

Reason:

1. on-chain commit/finalize transactions are public
2. the backend session model binds a mint session to a concrete CoreID
3. backend-side operational records exist for recovery/debugging
4. normal hosting/provider metadata may also exist outside the application layer

This is an operational inference from the chosen Vercel + Contabo + SQLite architecture, not a claim that the app intentionally collects KYC data.

## Current CorePass / KYC Scope
The current launch target is the CorePass **Protocol-direct** path only:

1. `corepass:sign`
2. `corepass:tx`

The current release does **not** depend on:

1. CorePass Connector Authorization
2. KYC-transfer
3. CTN as a launch prerequisite

Relevant reference:
1. `docs/COREPASS_PROTOCOL_AND_CONNECTOR_NOTES.md`

## Freeze / Renounce Policy
The current public policy is:

1. the deployer should not remain the long-term owner
2. ownership should move to the cold owner wallet after deploy-window setup
3. owner actions during launch/live mint are treated as exceptional and should be publicly logged
4. immediate renounce is not promised before canary/live-mint stability is proven
5. after the active mint phase, either:
   - renounce ownership and publish the tx hash
   - or explicitly disclose why ownership is still being retained

Relevant reference:
1. `docs/FREEZE_AND_RENOUNCE_POLICY.md`

## What Should Be Publicly Published By Mainnet Launch
Before or at the mainnet canary/public opening stage, the project should publish:

1. the real mainnet contract address
2. deploy transaction hashes
3. verify status or manual verify packet path
4. the toolchain / dependency review surface needed to reproduce the contract build:
   - Ylem / Foxar / Spark versioning
   - imported dependency paths or the verification packet that already captures them
5. the current launch state: `closed`, `canary`, or `public`
6. the current trust surface:
   - owner/admin policy
   - signer policy
   - relayer/finalizer policy
7. canary evidence before public opening
8. the public evidence packet/checklist itself:
   - `docs/MAINNET_PUBLIC_EVIDENCE_CHECKLIST.md`

## Practical Reader Summary
If you are reviewing Core Cats before mint:

1. trust the fixed supply/limit/randomness properties only to the extent they are visible in the published contract and launch artifacts
2. treat signer rotation, signer-lock timing, and backend issuance as explicit operational trust surfaces
3. do not assume the current mint flow is privacy-preserving in the anonymity sense
4. do not treat the top-level contract file as the whole review surface; imported dependencies and the active Core toolchain also matter
5. do expect the project to publish enough addresses, tx hashes, manifests, verify artifacts, and runbooks for outside inspection
