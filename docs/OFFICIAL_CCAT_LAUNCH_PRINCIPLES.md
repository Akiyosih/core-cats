# Official CCAT Launch Principles

Status: public-facing statement of the intended official `CCAT` release philosophy

## Purpose
This note states the non-negotiable principles for the official `CCAT` contract before it is deployed.

It is intentionally separate from current canary or rehearsal notes.

If a current live surface note and this document differ, read:
1. this note as the intended official release standard
2. the live-surface note as disclosure of what is actually live right now

## Non-Negotiable Principles
### 1. Minted cats should not change
Once a cat is minted, its image, name, description, and attributes should not change later.

### 2. Official immutability should exist from deploy
The official `CCAT` release should be technically fixed from deploy rather than "locked later" after launch.

### 3. The mint rule is wallet-based, not person-based
The official rule is `1 wallet = 3 cats`.

Core Cats does not claim to enforce `1 human = 3 cats` under the current architecture.

### 4. Official mint should be permissionless
The official `CCAT` mint should not depend on:
1. an allowlist
2. an off-chain signer deciding who may mint
3. a project-operated approval gate

The intended mint rule should instead be the on-chain rule itself:
1. total supply `1000`
2. per-wallet limit `3`

### 5. Official `CCAT` should have no retained owner/admin path
The intended official contract posture is no retained owner/admin after deploy.

That means the final release should not ask the public to trust a later owner freeze, signer lock, or post-deploy admin renounce sequence.

### 6. "Fully on-chain" refers to the NFT object and mint rule
For Core Cats, `fully on-chain` should mean:
1. the NFT image/metadata are produced from on-chain data and logic
2. the mint rule is enforced on-chain
3. those properties are inspectable from deployed source and public evidence

It does **not** mean:
1. the website UI itself is on-chain
2. every convenience layer is permanent
3. every wallet app or browser will behave identically

### 7. Public promises should be limited to what outsiders can verify
Core Cats should publicly promise on-chain guarantees and publicly inspectable evidence.

It should not market best-effort operational behavior as if it were an on-chain guarantee.

## What Official CCAT Should Guarantee On-Chain
The intended official `CCAT` release should let an outside reader verify these points from public artifacts:

1. the collection supply cap is `1000`
2. the per-wallet mint limit is `3`
3. mint access is permissionless rather than signer-gated
4. the deployed NFT object does not depend on a mutable renderer pointer or later admin action
5. the contract does not retain a post-deploy owner/admin path
6. the project publishes enough source, verification, and deploy evidence for outsiders to inspect those claims

## What Remains Best-Effort Rather Than Guaranteed
Core Cats can still provide off-chain convenience layers, but they should be described honestly:

1. the mint website and collection browser are convenience layers, not the NFT itself
2. wallet-app/browser return behavior can vary by device and app build
3. same-device mobile mint is a UX path, not a philosophical definition of the NFT
4. long-term website hosting is a best-effort service even when the NFT object itself is on-chain

## Consequences Of These Principles
If the official deployed contract still requires:
1. owner actions after deploy
2. signer rotation
3. signer lock
4. retained mint-eligibility gating

then the deployed release would not fully match this philosophy and should be disclosed as such before mint opens.

## Public Reader Summary
The intended official `CCAT` release standard is:

1. minted cats do not change
2. immutability begins at deploy
3. mint is `1 wallet = 3 cats`
4. mint is permissionless
5. no retained owner/admin path remains after deploy
6. public promises stay limited to what the chain, source, and evidence can actually prove
