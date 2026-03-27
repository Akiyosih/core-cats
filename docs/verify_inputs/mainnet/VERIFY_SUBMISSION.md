# Core Blockchain Mainnet Manual Verify Submission

Status: Official mainnet packet prepared from the current canonical source tree.

## Scope
This packet is for the official Core Blockchain deployment of:

1. `CoreCatsOnchainData`
2. `CoreCatsMetadataRenderer`
3. `CoreCats`

## Deployment Targets

### Shared deploy block
1. Block number: `16880258`
2. Block timestamp (JST): `2026-03-21T21:01:16+09:00`

### CoreCatsOnchainData
1. Contract address: `cb748bebbcac49b28fdeccb8a56f1cf677e9d94ef25c`
2. Deploy tx: `0x5a6d7faad990b46e5028d7cbc95244d1c042d1b44a2d888327d47a939739f440`
3. Contract path: `foxar/src/CoreCatsOnchainData.sol:CoreCatsOnchainData`
4. Constructor args: none

### CoreCatsMetadataRenderer
1. Contract address: `cb762d998b8e79a74e1bc667b1ba2fd4154f25a467ac`
2. Deploy tx: `0x8a657061a784d8303b98b494cc5d3e5bb70344a04e79b76e254684d931eaa8d7`
3. Contract path: `foxar/src/CoreCatsMetadataRenderer.sol:CoreCatsMetadataRenderer`
4. Constructor args file: `CoreCatsMetadataRenderer.constructor-args.txt`

### CoreCats
1. Contract address: `cb40316dcf944c9c2d4d1381653753a514e5e01d5df3`
2. Deploy tx: `0x9f47acfdaad77ace0f6200cc3f7443d1da70f29e1cf658cdf903d4874076063c`
3. Contract path: `foxar/src/CoreCats.sol:CoreCats`
4. Constructor args file: `CoreCats.constructor-args.txt`

## Compiler Settings
1. Compiler: `1.1.2+commit.cb4b093a`
2. Optimizer: enabled
3. Optimizer runs: `200`

## Files
1. `CoreCatsOnchainData.standard-input.json`
2. `CoreCatsMetadataRenderer.standard-input.json`
3. `CoreCats.standard-input.json`
4. `CoreCatsMetadataRenderer.constructor-args.txt`
5. `CoreCats.constructor-args.txt`

## Source and Deployment Notes
1. The `standard-input.json` files were prepared from the current canonical source tree.
2. The constructor argument files were reconstructed by matching the current-source creation bytecode length against the official mainnet creation tx input and taking the ABI-encoded suffix.
3. The exact repository commit used for the original broadcast deploy was later confirmed from the original Foxar mainnet broadcast artifacts:
   - `d30f394f4da352871a5677bb32d702cd4aa55f8c`
4. The original Foxar mainnet broadcast artifacts also record the same 3 official tx hashes and returned addresses for `CoreCatsOnchainData`, `CoreCatsMetadataRenderer`, and `CoreCats`.
5. The official deploy script and official env defaults were finalized no later than commit `d4b1ebd192d42a0a5e669287267d36e4326f6cba`.
6. Current source still matches the deploy-relevant contents of:
   - `foxar/script/CoreCatsDeploy.s.sol`
   - `foxar/.env.mainnet-official.example`

## Why Post-Deploy Submission Is Expected
The public runbooks treat explorer verification as a post-deploy step:

1. `docs/MAINNET_CLOSED_LAUNCH_RUNBOOK.md`
   - `Attempt explorer verification.`
   - `if not, submit or stage the manual verify packet`
2. `docs/WORK_PROCEDURE_CORE_BLOCKCHAIN.md`
   - `Attempt explorer verification on mainnet.`
   - `otherwise use the prepared manual verify packet path`

## Suggested Submission Contents
Send the following together:

1. project name: `CoreCats`
2. symbol: `CCAT`
3. contract addresses for all three contracts
4. deploy tx hashes for all three contracts
5. contract path/name for all three contracts
6. compiler version and optimizer settings
7. corresponding `standard-input.json` file for each contract
8. constructor args for `CoreCatsMetadataRenderer` and `CoreCats`
