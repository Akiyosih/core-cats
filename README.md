# CoreCats 🐱
A fully on-chain NFT project on Core Blockchain.

## Repository Role
- Active implementation source of truth: this repository (`core-cats`)
- Reference archive repository: `core-cats-eth` (frozen reference track)

## Preview
![Core Cats Preview Grid](docs/assets/core_cats_preview_grid.png)
Representative sample grid from the current 1,000-cat artwork review set.

## Project Docs
- [Implementation Source Mapping](docs/IMPLEMENTATION_SOURCE.md)
- [Final 1000 Trait Schema](docs/FINAL1000_TRAIT_SCHEMA.md)
- [Web UI / Mint DApp Spec](docs/WEB_UI_MINT_DAPP_SPEC.md)
- [Core Blockchain Work Procedure / Launch Path](docs/WORK_PROCEDURE_CORE_BLOCKCHAIN.md)
- [Mainnet Closed Launch Runbook](docs/MAINNET_CLOSED_LAUNCH_RUNBOOK.md)
- [Core Testnet Deploy Runbook](docs/CORE_TESTNET_DEPLOY_RUNBOOK.md)
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
- 📦 Open-source, transparent, and rugpull-resistant


## License
This project is licensed under the MIT License.


## 📜 Project Specification / プロジェクト仕様書
---

### English

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
- No operational control to change total supply or core specifications after deployment

---

### 日本語

**プロジェクト名**: CoreCats  
**ブロックチェーン**: Core Blockchain  
**トークン規格**: CRC721 / ERC721互換  
**総発行枚数**: **1,000体（不可変）**  
**ユーザーあたりミント上限**: **1ウォレットあたり3体（現行方針、不可変）**  
**画像仕様**: **24×24 SVGドットアート** / 全てオンチェーン保存 / パーツ組合せで唯一性生成  
**ミント条件**: まず署名付きフリーミントを採用し、CorePass/KYC制限は将来拡張として扱う  
**ミント価格**: **無料（一次販売手数料なし）**  
**二次流通手数料**: **なし**  
**公開方針**: コントラクト、生成ロジック、デプロイ履歴をGitHubで全公開  

**技術方針**:
1. **乱数生成方式**: `commit-finalize + future blockhash + lazy Fisher-Yates`  
   - Core DevinリハーサルとCore本番で同一アルゴリズムを採用  
   - オンチェーンデータから第三者が再計算・検証できる設計  
   - 将来VRFが確定した場合は`RandomSource`抽象で差し替え可能（NFT意味論は維持）  
2. **不可変設定**: 総発行枚数・ユーザー上限をコントラクトで固定  
3. **信頼性・オープン性**:  
   - ソースコードとアートパーツをすべてGitHubで公開  
   - 外部監査は省略し、オープンレビュー方式でコスト削減  

**開発ステップ**:
1. **MVPスマートコントラクト作成**:  
   - `commitMint()`・`finalizeMint()`・`tokenURI()` を、透明なランダム割当フローとして実装  
   - 乱数生成は`commit-finalize + future blockhash + lazy Fisher-Yates`  
2. **テストネット検証**:  
   - Core testnetでデプロイ、commit、finalize、tokenURI確認  
3. **本番クローズドローンチ**:
   - Core mainnetへデプロイしつつ、公開ミントはまだ閉じる
   - Web、透明性導線、コントラクトアドレスを公開する
   - 実運用ウォレットフローで canary mint を実施する
4. **一般公開**:
   - canary 成功後に一般ミントを開放する
   - コード・パーツ・ハッシュ・ローンチ記録をGitHubで公開する

**運営ポリシー**:
- プロジェクトは完全フリー、二次流通ロイヤリティなし  
- デプロイ後は総発行数や主要仕様を変更できないように設計
