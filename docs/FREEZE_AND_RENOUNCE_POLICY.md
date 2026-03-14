# Core Cats Freeze / Renounce Policy

Status: public-facing policy note for the current mainnet launch path

## Purpose
Explain how Core Cats intends to handle owner/admin powers after mainnet deployment.

## Current Contract Reality
The intended official `CoreCats` contract keeps one launch-critical owner-controlled action:

1. `setSigner(address)`
2. `lockSigner()`

The official `metadataRenderer` address is intended to be fixed in the constructor rather than rotated after deploy.

That means the official contract is still not "fully renounced at deploy" by default, but the main mutable launch surface is signer control rather than renderer rotation.

Relevant local reference:
1. `foxar/src/CoreCats.sol`

## Current Operational Policy
### 1. Deployer is temporary
The deployer wallet is not intended to remain the long-term owner.

During the deploy window it may:
1. deploy the contracts
2. perform the minimum setup transactions
3. transfer ownership to the cold owner wallet

### 2. Cold owner is the default owner after setup
After the required deploy-window setup is complete, ownership should be transferred to the dedicated cold owner/admin wallet.

Operationally this means:
1. Vercel is not the owner
2. Contabo is not the owner
3. the relayer/finalizer is not the owner
4. the deployer should not remain the owner longer than necessary

### 3. Public mint should not depend on a hot owner key
The intended public mint path uses:
1. a signer key for mint authorization
2. a finalizer/relayer key for operational convenience

Neither of those keys should hold contract ownership.

## Freeze Policy
Core Cats intends to use a two-stage posture.

### Stage A: soft freeze during launch / live mint
During mainnet closed launch, canary, and any live public mint window:

1. ownership stays on the cold owner wallet
2. owner actions are treated as exceptional, not routine
3. if an owner action is needed, the project should publish:
   - the transaction hash
   - the reason
   - the affected setting

Reason:
1. the current release path is still signature-gated
2. signer rotation may be needed if a real launch problem appears
3. once signer stability is proven, the owner can irreversibly call `lockSigner()`

## Renounce Policy
Core Cats does not promise automatic immediate renounce at the first deploy block.

Instead, the current public policy is:

1. do not renounce before the mainnet canary is complete
2. do not renounce while the team still believes signer rotation may realistically be needed for the active mint phase
3. once the live mint phase is stable or complete, choose one of these public end states:
   - call `lockSigner()` and publish the tx hash
   - renounce ownership and publish the renounce tx hash
   - or keep ownership on the cold wallet and publicly explain why ownership is still being retained

## What Is Already Fixed Even Before Renounce
Regardless of later owner policy, the active contract already fixes:

1. total supply at `1000`
2. per-address mint limit at `3`

So the main remaining trust surface is not supply inflation or post-deploy renderer replacement. It is operator control over signer configuration until `lockSigner()` and any later ownership decision.

## Public Reader Summary
Current policy in plain language:

1. the deployer should not remain the long-term owner
2. ownership should move to the cold owner wallet after setup
3. owner powers are expected to stay dormant during normal operation
4. renounce is a later hard-freeze option, not a promise made before the real mainnet flow is proven
5. if ownership is not renounced later, that should be explicitly disclosed rather than hidden
