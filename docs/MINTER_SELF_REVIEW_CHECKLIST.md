# Core Cats Minter Self-Review Checklist

Status: public-facing review checklist for readers who want to inspect the mint path before signing

## Purpose
This note is for minters who want a short practical review path before minting.

It does not replace explorer verification or a full contract review. It is the minimum public checklist the project expects careful minters to use.

## What This Checklist Can And Cannot Prove
This checklist can help you:

1. confirm you are looking at the intended contract and mint flow
2. confirm the wallet prompts match the published mint design
3. identify the current operator-controlled trust surfaces before minting

This checklist cannot, by itself, prove:

1. that a deployed contract has already been fully verified on the explorer
2. that imported dependency contracts are harmless without reviewing their verified source
3. that a future owner action will never happen before a later freeze or renounce step

## Before Minting
1. check the current network, launch state, and contract address on `/transparency`
2. confirm the contract page on the explorer matches the same published address
3. confirm the project has published either:
   - explorer verified source, or
   - a reproducible manual verify packet path
4. read the public trust notes before minting:
   - `docs/TRUST_AND_PRIVACY_SURFACE.md`
   - `docs/FREEZE_AND_RENOUNCE_POLICY.md`

## Dependency And Toolchain Checks
The top-level CoreCats contract is not the whole review surface.

1. `foxar/src/CoreCats.sol` imports `CRC721`, `Ownable`, and `EDDSA`
2. those imports come from the pinned submodule path `foxar/lib/corezeppelin-contracts`
3. the active build/deploy path uses the Core-specific Ylem / Foxar / Spark toolchain rather than a generic Ethereum-only Solidity path

Practical implication:

1. reviewing only `CoreCats.sol` is not enough
2. the imported dependency sources and the deployed explorer verification both matter
3. if the explorer is not yet verified, wait for the verify packet or equivalent reproducibility evidence before treating the contract surface as fully inspectable

## What To Confirm Inside CorePass
The intended user-facing mint flow has two approvals.

1. first approval:
   - should be a wallet-binding signature for the mint session
   - should not be a token transfer
2. second approval:
   - should be the actual mint contract call
   - `to` should match the published CoreCats contract address
   - `value` should be `0`
   - gas is still expected

Stop and re-check before signing if the wallet shows any of these instead:

1. `approve`
2. `setApprovalForAll`
3. an ERC20 transfer
4. a destination contract that does not match the published CoreCats contract
5. a non-zero native token value unless the public mint policy has explicitly changed

## What To Confirm After Minting
1. inspect the commit transaction on the explorer
2. inspect the finalize transaction on the explorer
3. confirm the NFT appears through `My Cats`
4. compare the explorer result, transparency page, and repository artifacts if you want deeper assurance

## Current Trust Surfaces To Understand
Core Cats is not currently a fully trustless mint.

Before minting, understand that:

1. the owner can still change `signer`
2. the owner can still change `metadataRenderer`
3. mint authorization is signature-gated
4. the preferred production path includes a relayer/finalizer backend for convenience
5. same-device mobile is a secondary supported path, not the primary release path

## Reader Summary
If you want the shortest possible rule set:

1. check `/transparency`
2. verify the contract address and explorer page
3. read the trust + freeze notes
4. sign only the published two-step mint flow
5. do not sign any approval-style prompt that falls outside that flow
