# Historical Mainnet Rehearsal Contracts

Status: public-facing reference for distinguishing the official `CCAT` collection from earlier mainnet rehearsal contracts

## Purpose
This note fixes one simple distinction for outside readers:

1. which contract is the official `CoreCats / CCAT` collection
2. which earlier mainnet contracts were rehearsal or pilot contracts only

These historical rehearsal contracts remain useful as public evidence of the pre-launch mint-path validation work, but they are not the canonical Core Cats collection.

## Canonical Collection
The official collection is:

1. `CoreCats / CCAT`
2. contract address:
   - `cb40316dcf944c9c2d4d1381653753a514e5e01d5df3`
3. deploy transaction:
   - `0x9f47acfdaad77ace0f6200cc3f7443d1da70f29e1cf658cdf903d4874076063c`
4. token description:
   - `CoreCats is a 1,000-piece fully on-chain 24x24 SVG cat collection on Core Blockchain, built from public code and fixed manifests.`

This is the only contract that should be treated as the official Core Cats collection.

## Historical Rehearsal Contracts
The following contracts were used for mainnet pilot or rehearsal work before the official release.

### CCATTEST
1. role:
   - self-only mainnet pilot contract
2. contract address:
   - `cb3022bb9ee4752d778f4c63b47559e77b4ca06a122a`
3. deploy transaction:
   - `0xa51874360387ac04be65fc5b386410a4a20944adbbf53882a0ca76a424bf568d`
4. token description:
   - `CCATTEST pilot for self-only CorePass mainnet validation. Non-official release.`

### CCATTEST2
1. role:
   - final pre-official mainnet rehearsal contract
2. contract address:
   - `cb56cf49bc281a2180113df64deed42d29034d4e77dd`
3. deploy transaction:
   - `0xc6f4ec013530aab89c589636e970fcc2fbb30d041b207ccd5c5e96d35c4cad01`
4. token description:
   - `CCATTEST2 pilot for final pre-official CorePass mainnet validation. Non-official release.`

## Interpretation Rule
Read these contracts as historical evidence, not as parallel official editions.

Practical rule:
1. official browse, transparency, and collection references should point to `CCAT`
2. `CCATTEST` and `CCATTEST2` should be treated as preserved rehearsal history
3. older pilot or canary notes should not be read as redefining which collection is official

## Why They Remain Public
The project intentionally keeps these historical contracts visible as evidence of the mainnet rehearsal process.

That means:
1. the history is not hidden
2. the official collection is still unambiguous
3. public evidence should prefer clear separation over retroactive cleanup

## Related References
1. [Official CCAT Launch Principles](OFFICIAL_CCAT_LAUNCH_PRINCIPLES.md)
2. [Mainnet Public Evidence Checklist](MAINNET_PUBLIC_EVIDENCE_CHECKLIST.md)
3. [Public Trust + Privacy Notes](TRUST_AND_PRIVACY_SURFACE.md)
4. [CCATTEST Rehearsal Canary Plan](CCATTEST_REHEARSAL_CANARY_PLAN.md)
5. [CCATTEST2 Private Canary Preview](CCATTEST2_PRIVATE_CANARY_PREVIEW.md)
