# 🐱 Core Cats - Fully On-chain NFT Project on Core Blockchain

## English

### Overview
Core Cats is one of the earliest fully on-chain NFT collections on the **Core Blockchain**.  
It features **24x24 pixel generative cats**, inspired by CryptoPunks, each with unique patterns, eye colors, and poses.  
All 1,000 NFTs are **fully generated and stored on-chain**—no off-chain metadata.

- **Total Supply:** 1,000 unique cats
- **Mint Type:** Free Mint (KYC required via CorePass)
- **License:** Fully open-source (MIT)
- **Blockchain:** Core Blockchain (CBC-20 / ERC-721 compatible)

---

### Objectives
- Become a **historic first wave** of fully on-chain NFTs on Core Blockchain.
- Provide a **fun, open, and transparent** experience for the community.
- **No hidden processes**: All code, assets, and development steps will be open-sourced on GitHub.
- Use **CorePass KYC** as a minting requirement to showcase its utility.
- Design inspired by CryptoPunks, but with unique cat personalities.

---

### Roadmap
1. **Local Development Setup**
   - Initialize Foxar/Spark project
   - GitHub repository setup and `.gitignore` for security
   - Connect to full node (Contabo-hosted)

2. **Smart Contract Development**
   - Implement minimal ERC-721-compatible contract
   - Store SVG images fully on-chain
   - Random trait generation logic

3. **Local & Testnet Testing**
   - Deploy to Foxar local environment
   - Run integration tests for minting and metadata

4. **Mainnet Deployment**
   - Deploy using dedicated issuer wallet (different from CorePass personal wallet)
   - Verify contract on explorer

5. **Launch & Community Engagement**
   - Open mint for KYC-verified users
   - Community showcase and support for trading

---

### Tech Stack
- **Smart Contracts:** Solidity (CBC-20/ERC-721)
- **Dev Tools:** Spark, Probe, Foxar
- **Frontend:** Static site (GitHub Pages / Vercel)
- **Node:** Contabo VPS full node

---

### License
MIT License - Feel free to use, remix, and build upon.

---

## 日本語

### 概要
**Core Cats** は **Core Blockchain** 上にデプロイされる、最初期のフルオンチェーンNFTコレクションの一つです。  
**24×24ピクセルのジェネラティブ猫アート**を特徴とし、模様・目の色・ポーズがすべてランダム生成されます。  
1,000体すべてが**完全にオンチェーンに保存**され、オフチェーンのメタデータは一切使用しません。

- **発行総数:** 1,000匹
- **ミント形式:** フリーミント（CorePassによるKYC必須）
- **ライセンス:** 完全オープンソース（MIT）
- **ブロックチェーン:** Core Blockchain（CBC-20 / ERC-721互換）

---

### 目的
- Core Blockchain上の**歴史的初期フルオンチェーンNFT**として位置づける
- コミュニティが安心して楽しめる、**オープンで透明なプロジェクト**
- 制作過程やコードを**完全公開**
- CorePass KYCをミント条件にし、**ユースケースを提示**
- クリプトパンクスを参考にしつつ、独自の猫キャラクターを創造

---

### ロードマップ
1. **ローカル開発環境構築**
   - Foxar/Sparkプロジェクト初期化
   - GitHubリポジトリ設定 & `.gitignore`で秘匿情報保護
   - フルノード（Contabo）接続

2. **スマートコントラクト開発**
   - 最小限のERC-721互換コントラクト実装
   - SVG画像を完全オンチェーン化
   - ランダム属性生成ロジック構築

3. **ローカル & テストネットテスト**
   - Foxarローカル環境にデプロイ
   - ミントやメタデータの統合テスト実施

4. **メインネットデプロイ**
   - CorePass個人アドレスとは別の発行者ウォレットでデプロイ
   - コントラクトをエクスプローラで検証

5. **ローンチ & コミュニティ展開**
   - KYC認証済みユーザー向けにミント開放
   - コミュニティ展示や取引サポート

---

### 技術スタック
- **スマートコントラクト:** Solidity (CBC-20/ERC-721)
- **開発ツール:** Spark, Probe, Foxar
- **フロントエンド:** 静的サイト（GitHub Pages / Vercel）
- **ノード:** Contabo VPS フルノード

---

### ライセンス
MITライセンス - 自由に利用・改変可能
