# Core Cats Mainnet Public Evidence Checklist

Status: public-safe checklist for what should be published at official `CCAT` launch

## Purpose
This note lists the minimum public evidence the project should publish so outside readers can inspect the live mainnet release without needing operator-only details.

Use this together with:
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
10. the live owner / signer / `metadataRenderer` values, either:
   - as explorer links, or
   - as published read results with tx/evidence links
   - including whether `signerLocked` is still `false` or has already been permanently set to `true`
11. the public trust-policy links:
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
9. the public-facing statement of current operational trust surfaces:
   - owner policy
   - signer policy
   - relayer/finalizer policy

## C. Required After Launch While Trust Surfaces Still Exist
If the project keeps any mutable or operator-controlled surface, keep publishing updates.

1. ownership transfer transaction hash when ownership moves
2. signer-lock transaction hash when `lockSigner()` is later executed
3. renounce transaction hash if ownership is later renounced
4. any `setSigner(...)` change with tx hash and reason
5. delayed explorer verification once it becomes available
6. any user-visible mint incident or regression that affects mint safety or correctness

## What This Checklist Does And Does Not Solve
Publishing this evidence materially improves transparency, but it does not remove every trust surface.

It helps outside readers verify:
1. what contract is live
2. what code/artifacts were intended
3. what toolchain and dependency path produced the deployment
4. what operational policy is still in force

It does not prove:
1. that an owner-controlled change will never be made before freeze or renounce
2. that a dependency is harmless without explorer verification or reproducible build evidence
3. that the backend will never have an outage or policy change

## Short Reader Summary
Before minting, a careful reader should be able to answer all of these from public evidence:

1. what exact contract is live
2. what repo commit and artifacts produced it
3. whether explorer verification or a verify packet exists
4. who still controls signer / ownership, and whether renderer was constructor-pinned
5. whether an official exact-host mint already succeeded
