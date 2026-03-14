# Core Cats Mainnet Public Evidence Checklist

Status: public-safe checklist for what should be published at official `CCAT` launch

## Purpose
This note lists the minimum public evidence the project should publish so outside readers can inspect the live mainnet release without needing operator-only details.

Use this together with:
1. `docs/OFFICIAL_CCAT_LAUNCH_PRINCIPLES.md`
1. `docs/TRUST_AND_PRIVACY_SURFACE.md`
2. `docs/FREEZE_AND_RENOUNCE_POLICY.md`
3. `docs/OFFICIAL_CCAT_CUTOVER_NOTE.md`

This checklist is intentionally public-safe.

Keep secrets and operator-only runtime detail out of this document:
1. private keys
2. passwords
3. server IPs or private hostnames
4. local filesystem paths
5. operator wallet mapping that is not intentionally public evidence

## A. Required Before Or At Official Closed Launch
Publish these when the official `CCAT` contract is deployed and the public site is in `closed`.

1. the final public site origin
2. the current launch state: `closed`
3. the official `CoreCats` contract address
4. the linked renderer / on-chain data contract addresses if they are separate contracts
5. the deploy transaction hashes
6. the repository commit SHA used for the deploy
7. the final public manifest / schema artifact paths used for the deploy inputs
8. explorer verify links, or:
   - the manual verify packet path
   - enough constructor/deploy metadata for outside reproduction
9. the active toolchain review surface:
   - Ylem version
   - Foxar / Spark versioning
   - imported dependency path family
   - pinned submodule commit or equivalent verify artifact
10. evidence that the official contract matches the stated launch-principles surface:
   - no retained owner/admin path
   - no signer-gated mint requirement
   - fixed renderer / on-chain data wiring if separate contracts are used
   - as explorer links, published read results, ABI/source links, or equivalent verify evidence
11. the public trust-policy links:
   - official launch principles
   - trust surface note
   - freeze / renounce policy
   - minter self-review checklist

## B. Required Before Switching To Public
Do not open the general mint until these are public.

1. at least one official `CCAT` mint on the exact final public-mint host
2. the canary commit transaction hash
3. the canary finalize transaction hash
4. the assigned token id or token ids
5. evidence that the minted token resolves correctly:
   - explorer links
   - `tokenURI` readback or equivalent artifact
   - `My Cats` / owner lookup confirmation
6. evidence that `/transparency` and explorer links point at the official `CCAT` contract, not `CCATTEST`
7. evidence that callback return stayed on the final public origin
8. if same-device mobile is disclosed publicly:
   - explicit disclosure that it is a secondary path, or
   - exact-host evidence for that path too
9. the public-facing statement of any remaining operational trust surfaces:
   - if the official target is achieved, state that contract-layer owner/admin and signer gating are absent
   - disclose any relayer/finalizer or web-host convenience layers separately

## C. Required After Launch While Trust Surfaces Still Exist
If the project keeps any mutable or operator-controlled surface, keep publishing updates.

1. delayed explorer verification once it becomes available
2. any user-visible mint incident or regression that affects mint safety or correctness
3. if the deployed contract does retain any mutable/admin surface contrary to the target philosophy, every related admin transaction hash and explanation

## What This Checklist Does And Does Not Solve
Publishing this evidence materially improves transparency, but it does not remove every trust surface.

It helps outside readers verify:
1. what contract is live
2. what code/artifacts were intended
3. what toolchain and dependency path produced the deployment
4. what operational policy is still in force

It does not prove:
1. that a dependency is harmless without explorer verification or reproducible build evidence
2. that the web or backend convenience layers will never have an outage or policy change
3. that a contract truly matches the no-owner / no-signer target unless the published source and evidence prove it

## Short Reader Summary
Before minting, a careful reader should be able to answer all of these from public evidence:

1. what exact contract is live
2. what repo commit and artifacts produced it
3. whether explorer verification or a verify packet exists
4. whether the official deployed contract truly has no retained owner/admin path and no signer gate
5. whether an official exact-host mint already succeeded
