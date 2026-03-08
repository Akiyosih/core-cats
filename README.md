# CoreCats 🐱
A fully on-chain NFT project on Core Blockchain.

## Repository Role
- Active implementation source of truth: this repository (`core-cats`)
- Reference archive repository: `core-cats-eth` (frozen reference track)

## Preview
![Core Cats Preview Grid](docs/assets/core_cats_preview_grid_teaser.png)
Representative random sample grid from the current 1,000-cat artwork review set.

## Project Docs
- [Implementation Source Mapping](docs/IMPLEMENTATION_SOURCE.md)
- [Final 1000 Trait Schema](docs/FINAL1000_TRAIT_SCHEMA.md)
- [Web UI / Mint DApp Spec](docs/WEB_UI_MINT_DAPP_SPEC.md)
- [Core Blockchain Work Procedure / Launch Path](docs/WORK_PROCEDURE_CORE_BLOCKCHAIN.md)
- [Mainnet Closed Launch Runbook](docs/MAINNET_CLOSED_LAUNCH_RUNBOOK.md)
- [Core Testnet Deploy Runbook](docs/CORE_TESTNET_DEPLOY_RUNBOOK.md)
- [Public Trust + Privacy Notes](docs/TRUST_AND_PRIVACY_SURFACE.md)
- [Freeze / Renounce Policy](docs/FREEZE_AND_RENOUNCE_POLICY.md)
- [Minter Privacy Note](docs/MINTER_PRIVACY_NOTE.md)
- [Public Document Language Policy](docs/PUBLIC_DOCUMENT_LANGUAGE_POLICY.md)
- [ADR-0001: Core Toolchain Priority](docs/DECISIONS/ADR-0001-core-toolchain-priority.md)
- [ADR-0002: Randomness Strategy](docs/DECISIONS/ADR-0002-randomness-strategy.md)
- [Core Cats ETH: Project Status (reference archive)](https://github.com/Akiyosih/core-cats-eth/blob/main/docs/PROJECT_STATUS.md)
- [Core Cats ETH: Roadmap (reference archive)](https://github.com/Akiyosih/core-cats-eth/blob/main/docs/ROADMAP_CORE_MIGRATION.md)

## Mirrored Final Artifacts
- `manifests/base1000_no_rare_latest.json`
- `manifests/final1000_review_manifest_v1.json`
- `manifests/final_1000_manifest_v1.json`
- `manifests/final_1000_validation_v1.json`
- `manifests/final_1000_trait_summary_v1.json`
- `manifests/final_1000_preview_consistency_v1.json`
- `manifests/trait_display_labels_v1.json`

## Imported Reference Implementation (from `core-cats-eth`)
- `contracts/reference_eth/CoreCats.sol`
- `contracts/reference_eth/CoreCatsMetadataRenderer.sol`
- `contracts/reference_eth/CoreCatsOnchainData.sol`
- `scripts/reference_eth/generate_onchain_data.py`
- `scripts/reference_eth/verify_renderer_manifest_match.mjs`
- `scripts/reference_eth/verify_renderer_pixels.mjs`

- 🧱 Built with Solidity for the Core ecosystem
- 🎨 Features 100% on-chain SVG artwork
- 🔐 Signature-gated free mint is the current public path; CorePass/KYC is a later extension target
- 📦 Open-source, transparent, and designed for public review


## License
This project is licensed under the MIT License.


## Project Specification
---

Public documentation in this repository uses English as the authoritative source.
See [Public Document Language Policy](docs/PUBLIC_DOCUMENT_LANGUAGE_POLICY.md).

**Project Name**: CoreCats  
**Blockchain**: Core Blockchain  
**Token Standard**: CRC721 / ERC721-compatible  
**Total Supply**: **1,000 (immutable)**  
**Mint Limit per User**: **3 per wallet address (current path, immutable)**  
**Artwork Specs**: **24×24 SVG pixel art** / Fully on-chain storage / Unique generation via part combination  
**Mint Condition**: Signature-gated free mint first; CorePass/KYC-gated mode is a future extension target  
**Mint Price**: **Free (no primary sale fee)**  
**Secondary Sale Fee**: **None**  
**Transparency Policy**: All contract code, generation logic, and deployment history will be publicly available on GitHub  

**Technical Policy**:
1. **Randomness Method**: `commit-finalize + future blockhash + lazy Fisher-Yates`  
   - Same algorithm on Core Devin rehearsal and Core production path  
   - Assignment process is designed to be replay-verifiable from on-chain data  
   - `RandomSource` abstraction keeps future VRF migration possible without NFT semantic changes  
2. **Immutability**: Total supply and per-user limit fixed at the contract level  
3. **Trust & Openness**:  
   - Full source code and art parts published on GitHub  
   - Open review process instead of formal audit (cost-saving)  
   - Current owner/admin powers and backend trust assumptions must be disclosed separately from the fixed supply claim

**Development Steps**:
1. **MVP Smart Contract**:  
   - Implement `commitMint()`, `finalizeMint()`, and `tokenURI()` around a transparent random assignment flow  
   - Use `commit-finalize + future blockhash + lazy Fisher-Yates` randomness  
2. **Testnet Verification**:  
   - Deploy, commit, finalize, and inspect tokenURI on Core testnet  
3. **Mainnet Closed Launch**:
   - Deploy on Core mainnet while keeping public mint closed
   - Publish the website, transparency links, and contract addresses
   - Run a controlled canary mint through the real production wallet flow
4. **Public Launch**:
   - Open general mint only after canary success
   - Publish code, parts, hashes, and launch evidence on GitHub

**Operation Policy**:
- Fully free project, no secondary sale royalties  
- No operational control to change total supply or per-wallet mint limit after deployment
- Signer rotation, renderer rotation, and backend-assisted mint operations remain explicit trust surfaces unless a later freeze/renounce policy is publicly executed
