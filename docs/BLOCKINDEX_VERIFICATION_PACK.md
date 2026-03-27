# Blockindex Verification Pack for CoreCats

## 1. 結論

このリポジトリ内で確認できる範囲では、`CoreCats` は Core Blockchain 向けの公式コレクションとして整理されており、少なくとも次の事項は repo 内根拠付きで示せます。

- 公式コレクション名は `CoreCats`、シンボルは `CCAT`
- repo は official mainnet collection と historical rehearsal contracts (`CCATTEST`, `CCATTEST2`) を明確に区別している
- official mainnet collection address 候補として `cb40316dcf944c9c2d4d1381653753a514e5e01d5df3` が複数箇所に明記されている
- active contract path は `foxar/src/CoreCats.sol` / `CoreCatsMetadataRenderer.sol` / `CoreCatsOnchainData.sol`
- deploy / post-deploy check / mint flow scripts と、Core-specific toolchain (`foxar` / `spark` / Ylem `1.1.2`) の根拠が repo 内にある
- fully on-chain JSON + SVG、`1000` fixed supply、`3` per wallet、`commit-finalize + future blockhash + lazy Fisher-Yates` という説明が source / docs の両方で確認できる
- official deploy tx `0x9f47acfdaad77ace0f6200cc3f7443d1da70f29e1cf658cdf903d4874076063c` は、後日 review 時に project-operated Core Blockchain full node でも確認でき、block `16880258` で contract address `cb40316dcf944c9c2d4d1381653753a514e5e01d5df3` を作成している
- 同じ deploy block `16880258`（timestamp `2026-03-21T21:01:16+09:00`）で、on-chain data tx `0x5a6d7faad990b46e5028d7cbc95244d1c042d1b44a2d888327d47a939739f440` と renderer tx `0x8a657061a784d8303b98b494cc5d3e5bb70344a04e79b76e254684d931eaa8d7` も full node で確認できる

一方で、repo 内だけでは次の重要事項は確定できません。

- 現在 Blockindex 上でこの contract がどう表示されているか
- 現在 explorer verification が完了しているか
- current live browse host の canonical URL
- deploy 時に使った正確な repo commit SHA

この pack は **repo 内証拠の整理を中心にしつつ、一部は後日 review 時の full-node 確認で補強**しています。explorer verification の最終確認は、なお Blockindex 側または人手の explorer 確認で補う必要があります。

## 2. 公式プロジェクト情報

| 項目 | 値 | 根拠ファイル | 短い引用 |
| --- | --- | --- | --- |
| プロジェクト名 | `CoreCats` | `README.md` | `# CoreCats` |
| 何のプロジェクトか | Core Blockchain 上の fully on-chain SVG pixel cat collection | `README.md` | `Fully on-chain SVG pixel cats on Core Blockchain.` |
| 公式コレクションの定義 | official `CCAT` が canonical collection | `README.md` | `the canonical official collection contract is \`cb40316dcf944c9c2d4d1381653753a514e5e01d5df3\`` |
| シンボル | `CCAT` | `foxar/.env.mainnet-official.example` | `CORECATS_SYMBOL=CCAT` |
| collection 名 | `CoreCats` | `foxar/.env.mainnet-official.example` | `CORECATS_COLLECTION_NAME=CoreCats` |
| token name prefix | `CoreCats` | `foxar/.env.mainnet-official.example` | `CORECATS_TOKEN_NAME_PREFIX=CoreCats` |
| コレクション説明文 | `CoreCats is a 1,000-piece fully on-chain 24x24 SVG cat collection on Core Blockchain, built from public code and fixed manifests.` | `foxar/script/CoreCatsDeploy.s.sol` | `string memory defaultDescription = "CoreCats is a 1,000-piece fully on-chain 24x24 SVG cat collection on Core Blockchain, built from public code and fixed manifests.";` |
| GitHub リポジトリ URL | `https://github.com/Akiyosih/core-cats` | `docs/IMPLEMENTATION_SOURCE.md` | `GitHub: https://github.com/Akiyosih/core-cats` |
| GitHub リポジトリ URL（UI 側） | `https://github.com/Akiyosih/core-cats` | `shared/public-site/components/public-pages/cat-detail-page-content.jsx` | `const PROJECT_REPOSITORY_URL = "https://github.com/Akiyosih/core-cats";` |
| official mainnet contract 候補 | `cb40316dcf944c9c2d4d1381653753a514e5e01d5df3` | `README.md` | `the canonical official collection contract is \`cb40316dcf944c9c2d4d1381653753a514e5e01d5df3\`` |
| official mainnet contract 候補（UI contract surface） | `cb40316dcf944c9c2d4d1381653753a514e5e01d5df3` | `web-public-teaser/lib/public-teaser-contract-surface.js` | `coreCatsAddress: "cb40316dcf944c9c2d4d1381653753a514e5e01d5df3"` |

### 公式サイト URL について

- `GitHub repository` は repo 内で確認できます。
- しかし **current browse host の canonical URL** は repo 内で固定値としては確認できません。
- `web-public-teaser/lib/public-runtime-config.js` には `https://core-cats-zeta.vercel.app` が出ますが、同ファイルのコメントで `not a provenance claim` とされています。

根拠:

- `web-public-teaser/lib/public-runtime-config.js`
  - `This fallback matches the current live mint host wiring and is not a provenance claim.`

したがって、**official site URL は repo 外で人手補完が必要**です。

## 3. コントラクト構成一覧

| コントラクト / 構成物 | 役割 | 本番対象か | 根拠ファイル | 短い引用 |
| --- | --- | --- | --- | --- |
| `CoreCats` | 本体 collection contract | official mainnet target | `foxar/src/CoreCats.sol` | `contract CoreCats is CRC721 {` |
| `CoreCatsMetadataRenderer` | fully on-chain metadata / SVG renderer | official mainnet auxiliary contract | `foxar/src/CoreCatsMetadataRenderer.sol` | `contract CoreCatsMetadataRenderer {` |
| `CoreCatsOnchainData` | packed on-chain trait/data tables | official mainnet auxiliary contract | `foxar/src/CoreCatsOnchainData.sol` | `contract CoreCatsOnchainData {` |
| `CCAT` | official canonical collection ラベル | official mainnet | `docs/HISTORICAL_MAINNET_REHEARSAL_CONTRACTS.md` | `The official collection is:` / ``CoreCats / CCAT`` |
| `CCATTEST` | historical self-only pilot | historical / not official | `docs/HISTORICAL_MAINNET_REHEARSAL_CONTRACTS.md` | `CCATTEST remains on mainnet as a historical self-only pilot and is not part of the official collection.` |
| `CCATTEST2` | historical pre-official rehearsal | historical / not official | `docs/HISTORICAL_MAINNET_REHEARSAL_CONTRACTS.md` | `CCATTEST2 remains on mainnet as a historical pre-official rehearsal and is not part of the official collection.` |
| `contracts/reference_eth/*` | archive-derived reference material | not active production path | `README.md` | `contracts/reference_eth/ and scripts/reference_eth/ remain as clearly labeled imported reference material.` |

### active contract path について

`foxar/src/` が active path です。

- `README.md`
  - `the active production-facing contract/build/deploy path is the Core-first \`foxar/\` workspace`

### 本番関連アドレス（repo 内記載）

| 項目 | 値 | 根拠ファイル | 短い引用 |
| --- | --- | --- | --- |
| official `CoreCats` | `cb40316dcf944c9c2d4d1381653753a514e5e01d5df3` | `web-public-teaser/lib/public-teaser-contract-surface.js` | `coreCatsAddress: "cb40316dcf944c9c2d4d1381653753a514e5e01d5df3"` |
| official renderer | `cb762d998b8e79a74e1bc667b1ba2fd4154f25a467ac` | `web-public-teaser/lib/public-teaser-contract-surface.js` | `coreCatsRendererAddress: "cb762d998b8e79a74e1bc667b1ba2fd4154f25a467ac"` |
| official on-chain data | `cb748bebbcac49b28fdeccb8a56f1cf677e9d94ef25c` | `web-public-teaser/lib/public-teaser-contract-surface.js` | `coreCatsDataAddress: "cb748bebbcac49b28fdeccb8a56f1cf677e9d94ef25c"` |

### 本番性と rehearsal 切り分け

- `README.md`
  - `CCATTEST and CCATTEST2 remain on mainnet as historical rehearsal contracts and are not the official collection`
- `docs/TRUST_AND_PRIVACY_SURFACE.md`
  - `older rehearsal notes may still describe historical signer-gated runs; those should not be read as the intended final official contract claim`

## 4. デプロイ・再現性に関する根拠

### 4.1 使用ツールチェーン

| 項目 | 値 | 根拠ファイル | 短い引用 |
| --- | --- | --- | --- |
| active workspace | `foxar/` | `README.md` | `the active production-facing contract/build/deploy path is the Core-first \`foxar/\` workspace` |
| Foxar config | remappings / libs 定義あり | `foxar/foxar.toml` | `libs = ["lib"]` |
| remappings | `corezeppelin-contracts`, `spark-std`, `solmate`, `openzeppelin-contracts` など | `foxar/foxar.toml` | `remappings = [` |
| Ylem version | `1.1.2` | `foxar/spark.toml` | `ylem_version = "1.1.2"` |
| compiler + optimizer evidence | `1.1.2+commit.cb4b093a`, optimizer runs `200` | `docs/verify_inputs/README.md` | `Compiler version: \`1.1.2+commit.cb4b093a\`` / `Optimizer: enabled, runs \`200\`` |
| submodule dependency roots | `bchainhub/spark-std`, `transmissions11/solmate`, `OpenZeppelin/openzeppelin-contracts`, `bchainhub/openzeppelin-contracts` | `.gitmodules` | `url = https://github.com/bchainhub/spark-std` |

### 4.2 deploy / check scripts

| スクリプト | 役割 | 根拠ファイル | 短い引用 |
| --- | --- | --- | --- |
| deploy | official deploy | `foxar/script/CoreCatsDeploy.s.sol` | `contract CoreCatsDeployScript is Script {` |
| post-deploy check | renderer / name / symbol / supply check | `foxar/script/CoreCatsPostDeployCheck.s.sol` | `require(metadataRenderer == expectedRenderer, "renderer mismatch");` |
| mint prepare | commit hash 生成 | `foxar/script/CoreCatsPrepareMint.s.sol` | `return keccak256(abi.encodePacked(vm.envBytes32("MINT_SECRET")));` |
| commit mint | `commitMint(quantity, commitHash)` 実行 | `foxar/script/CoreCatsCommitMint.s.sol` | `CoreCats(coreCatsAddress).commitMint(quantityUint8, commitHash);` |
| finalize mint | `finalizeMint(minter)` 実行 | `foxar/script/CoreCatsFinalizeMint.s.sol` | `coreCats.finalizeMint(minter);` |
| state read | supply / renderer readback | `foxar/script/CoreCatsReadState.s.sol` | `totalSupply = coreCats.totalSupply();` |

### signer 設定 script について

この active Core path では、**official `CCAT` 用の signer 設定 script は repo 内では確認できません。**

repo 内で確認できる根拠は次のとおりです。

- `foxar/src/CoreCats.sol`
  - constructor は `collectionName`, `collectionSymbol`, `metadataRenderer` のみを受け取る
  - `constructor(string memory collectionName_, string memory collectionSymbol_, address metadataRenderer_)`
- `docs/OFFICIAL_CCAT_LAUNCH_PRINCIPLES.md`
  - `mint access is permissionless rather than signer-gated`

したがって、**official production path に signer setter がある**とは repo 内では確認できません。

### 4.3 constructor / 初期値

| コントラクト | constructor / 初期化 | 根拠ファイル | 短い引用 |
| --- | --- | --- | --- |
| `CoreCatsOnchainData` | no-arg deploy が使われている | `foxar/script/CoreCatsDeploy.s.sol` | `data = new CoreCatsOnchainData();` |
| `CoreCatsMetadataRenderer` | `dataAddress`, `tokenNamePrefix`, `tokenDescription`, `superrarePlaceholderEnabled` | `foxar/src/CoreCatsMetadataRenderer.sol` | `constructor(address dataAddress, string memory tokenNamePrefix_, string memory tokenDescription_, bool superrarePlaceholderEnabled_)` |
| `CoreCats` | `collectionName`, `collectionSymbol`, `metadataRenderer` | `foxar/src/CoreCats.sol` | `constructor(string memory collectionName_, string memory collectionSymbol_, address metadataRenderer_)` |

### 4.4 official deploy defaults / env names

| 項目 | 値 / env | 根拠ファイル | 短い引用 |
| --- | --- | --- | --- |
| collection name env | `CORECATS_COLLECTION_NAME` | `foxar/.env.mainnet-official.example` | `CORECATS_COLLECTION_NAME=CoreCats` |
| symbol env | `CORECATS_SYMBOL` | `foxar/.env.mainnet-official.example` | `CORECATS_SYMBOL=CCAT` |
| token description env | `CORECATS_TOKEN_DESCRIPTION` | `foxar/.env.mainnet-official.example` | `CORECATS_TOKEN_DESCRIPTION="CoreCats is a 1,000-piece fully on-chain 24x24 SVG cat collection on Core Blockchain, built from public code and fixed manifests."` |
| deployer secrets kept outside repo | RPC / keystore / password separated from example file | `docs/OFFICIAL_CCAT_CUTOVER_NOTE.md` | `Keep these secrets or live values outside the repository:` |
| post-deploy expected values env | `CORECATS_ADDRESS`, `EXPECTED_RENDERER_ADDRESS`, `EXPECTED_COLLECTION_NAME`, `EXPECTED_COLLECTION_SYMBOL` | `foxar/script/CoreCatsPostDeployCheck.s.sol` | `address coreCatsAddress = vm.envAddress("CORECATS_ADDRESS");` |

### 4.4.1 official deploy 時点の script 状態に関する repo-side 推定

repo 内の git history と private non-secret note を突き合わせると、official mainnet deploy に使われた script 状態について次のことが言えます。

1. `foxar/script/CoreCatsDeploy.s.sol` の最後の更新は `d4b1ebd192d42a0a5e669287267d36e4326f6cba`
2. `foxar/.env.mainnet-official.example` の最後の更新も `d4b1ebd192d42a0a5e669287267d36e4326f6cba`
3. その commit 時刻は `2026-03-21 18:49:30 +0900`
4. official address を public surface に入れた `web-public-teaser/lib/public-teaser-contract-surface.js` の最初の commit は `b5712ff858762c0f255f6bcaaf43e37184ac32cf`
5. その commit 時刻は `2026-03-21 21:33:11 +0900`

repo-side での最も強い整理は次です。

- official deploy 用の script / env defaults は **`d4b1ebd` 時点で固まっている**
- `b5712ff` までには public contract surface 側へ official addresses が入っている
- したがって、**official deploy 実行は `2026-03-21 18:49:30 +0900` 以後、`2026-03-21 21:33:11 +0900` 以前**という推定が成り立つ
- chain-side で確認した official deploy block `16880258` の timestamp は **`2026-03-21T21:01:16+09:00`** で、上の commit window の中に収まる

さらに、current HEAD と `d4b1ebd` の間で `foxar/script/CoreCatsDeploy.s.sol` と `foxar/.env.mainnet-official.example` に差分はありません。  
そのため、**deploy に使われた official deploy script / official env defaults の内容自体は current repo と実質一致している**と見るのが妥当です。

根拠:

- `docs/OFFICIAL_CCAT_CUTOVER_NOTE.md`
  - `Official Deploy Dry-Run Inputs`
  - `Expected official values:`
- `foxar/.env.mainnet-official.example`
  - `CORECATS_COLLECTION_NAME=CoreCats`
  - `CORECATS_SYMBOL=CCAT`
  - `CORECATS_TOKEN_DESCRIPTION="CoreCats is a 1,000-piece fully on-chain 24x24 SVG cat collection on Core Blockchain, built from public code and fixed manifests."`
- `web-public-teaser/lib/public-teaser-contract-surface.js`
  - `coreCatsAddress: "cb40316dcf944c9c2d4d1381653753a514e5e01d5df3"`

注意:

- exact deploy commit SHA そのものは repo 内ファイルだけでは断定できません
- ただし、deploy script / official env defaults の内容は `d4b1ebd` 時点のものに固定されていると見てよいです

### 4.4.2 official deploy block の chain-side 確認

repo 記載だけでなく、後日 review 時に project-operated Core Blockchain full node を照会した結果、official deploy block `16880258` に含まれる 3 本の creation tx は次の chain-side 事実と一致した。

#### `CoreCatsOnchainData`

1. tx hash:
   - `0x5a6d7faad990b46e5028d7cbc95244d1c042d1b44a2d888327d47a939739f440`
2. receipt:
   - `status: 0x1`
   - `blockNumber: 16880258`
   - `contractAddress: cb748bebbcac49b28fdeccb8a56f1cf677e9d94ef25c`

#### `CoreCatsMetadataRenderer`

1. tx hash:
   - `0x8a657061a784d8303b98b494cc5d3e5bb70344a04e79b76e254684d931eaa8d7`
2. receipt:
   - `status: 0x1`
   - `blockNumber: 16880258`
   - `contractAddress: cb762d998b8e79a74e1bc667b1ba2fd4154f25a467ac`

#### `CoreCats`

1. tx hash:
   - `0x9f47acfdaad77ace0f6200cc3f7443d1da70f29e1cf658cdf903d4874076063c`
2. receipt:
   - `status: 0x1`
   - `blockNumber: 16880258`
   - `contractAddress: cb40316dcf944c9c2d4d1381653753a514e5e01d5df3`

#### shared deploy block

1. block:
   - `number: 16880258`
   - the block transaction list includes
     - `0x5a6d7faad990b46e5028d7cbc95244d1c042d1b44a2d888327d47a939739f440`
     - `0x8a657061a784d8303b98b494cc5d3e5bb70344a04e79b76e254684d931eaa8d7`
     - `0x9f47acfdaad77ace0f6200cc3f7443d1da70f29e1cf658cdf903d4874076063c`

整理すると:

- repo に書かれていた on-chain data address / renderer address / official address の組は、chain-side でも同じ deploy block `16880258` の 3 creation tx として確認できた
- repo に書かれていた official deploy tx は、chain-side でも `cb40316dcf944c9c2d4d1381653753a514e5e01d5df3` の creation tx として確認できた
- `docs/HISTORICAL_MAINNET_REHEARSAL_CONTRACTS.md` に書かれていた official deploy tx / official address の組は、repo 記載としてだけでなく live chain evidence とも整合している

### 4.5 再現・検証の補助資料

| 項目 | 内容 | 根拠ファイル | 短い引用 |
| --- | --- | --- | --- |
| manual verify inputs | current-source verify input index あり | `docs/verify_inputs/README.md` | `This directory stores manual verification inputs for current-source CoreCats contracts.` |
| mainnet verify packet | official mainnet packet あり | `docs/verify_inputs/mainnet/VERIFY_SUBMISSION.md` | `Status: Official mainnet packet prepared from the current canonical source tree.` |
| live token evidence helper | on-chain `tokenURI`, owner, metadata renderer を読む helper | `scripts/read_live_token_evidence.py` | `description="Read live CoreCats token evidence over xcb_call without spark address parsing."` |
| Core-specific RPC support | `xcb_call` / `eth_call` 両対応 | `mint-backend/corecats_mint_backend/rpc.py` | `CALL_METHODS = ("xcb_call", "eth_call")` |

## 5. Blockindex へ提出するとよさそうな情報の整理

| 項目名 | 値 | 根拠ファイル | 提出可否 |
| --- | --- | --- | --- |
| Project name | `CoreCats` | `README.md`, `foxar/.env.mainnet-official.example` | そのまま提出可能 |
| Symbol | `CCAT` | `foxar/.env.mainnet-official.example` | そのまま提出可能 |
| Official collection address | `cb40316dcf944c9c2d4d1381653753a514e5e01d5df3` | `README.md`, `web-public-teaser/lib/public-teaser-contract-surface.js`, `docs/HISTORICAL_MAINNET_REHEARSAL_CONTRACTS.md` | そのまま提出可能 |
| Renderer address | `cb762d998b8e79a74e1bc667b1ba2fd4154f25a467ac` | `web-public-teaser/lib/public-teaser-contract-surface.js` | そのまま提出可能。project-operated full node で deploy tx `0x8a657061a784d8303b98b494cc5d3e5bb70344a04e79b76e254684d931eaa8d7` の receipt も確認済み |
| On-chain data address | `cb748bebbcac49b28fdeccb8a56f1cf677e9d94ef25c` | `web-public-teaser/lib/public-teaser-contract-surface.js` | そのまま提出可能。project-operated full node で deploy tx `0x5a6d7faad990b46e5028d7cbc95244d1c042d1b44a2d888327d47a939739f440` の receipt も確認済み |
| Official deploy tx | `0x9f47acfdaad77ace0f6200cc3f7443d1da70f29e1cf658cdf903d4874076063c` | `docs/HISTORICAL_MAINNET_REHEARSAL_CONTRACTS.md` | repo 記載として提出可能。project-operated full node で `block 16880258 / contractAddress cb40316...` を確認済み |
| Token description | `CoreCats is a 1,000-piece fully on-chain 24x24 SVG cat collection on Core Blockchain, built from public code and fixed manifests.` | `foxar/script/CoreCatsDeploy.s.sol`, `foxar/.env.mainnet-official.example`, `docs/HISTORICAL_MAINNET_REHEARSAL_CONTRACTS.md` | そのまま提出可能 |
| Supply / per-wallet rule | `1000`, `3 per wallet` | `foxar/src/CoreCats.sol`, `docs/OFFICIAL_CCAT_LAUNCH_PRINCIPLES.md` | そのまま提出可能 |
| Random assignment design | `commit-finalize + future blockhash + lazy Fisher-Yates` | `docs/DECISIONS/ADR-0002-randomness-strategy.md`, `foxar/src/CoreCats.sol` | そのまま提出可能 |
| Toolchain | Ylem `1.1.2`, Foxar workspace, Spark config, remappings, submodules | `foxar/spark.toml`, `foxar/foxar.toml`, `.gitmodules`, `docs/verify_inputs/README.md` | そのまま提出可能 |
| GitHub repository URL | `https://github.com/Akiyosih/core-cats` | `docs/IMPLEMENTATION_SOURCE.md`, `shared/public-site/components/public-pages/cat-detail-page-content.jsx` | そのまま提出可能 |
| Official site URL | repo 内では canonical browse URL を固定確認できない | `web-public-teaser/lib/public-runtime-config.js` | 人手で補完が必要 |
| Explorer verification status | repo 内では確認できない | n/a | 人手で補完が必要 |
| Mainnet manual verify packet path | `docs/verify_inputs/mainnet/VERIFY_SUBMISSION.md` | `docs/verify_inputs/mainnet/VERIFY_SUBMISSION.md` | そのまま提出可能 |
| Deploy commit SHA | repo 内では official deploy に対応する exact commit SHA を確認できない | n/a | 人手で補完が必要 |

## 6. リポジトリ内では確認できない事項

1. Blockindex 上で official `CCAT` contract が現在 verified 表示かどうか
2. current canonical browse host URL
3. current canonical mint/support host URL を provenance として主張してよいか
4. official deploy に使った exact repository commit SHA
5. exact Foxar binary version
6. exact Spark binary version
7. live explorer 上の renderer / on-chain data contract verification 状態
8. live site 上の contract surface と repo 記載アドレスの current 一致確認
9. official production path に signer 設定 script が存在するか

## 7. Blockindex 向け提出チェックリスト

### repo から埋まるもの

- [ ] Project name: `CoreCats`
- [ ] Symbol: `CCAT`
- [ ] Official contract address: `cb40316dcf944c9c2d4d1381653753a514e5e01d5df3`
- [ ] Renderer address
- [ ] On-chain data address
- [ ] Repo URL
- [ ] Contract path:
  - `foxar/src/CoreCats.sol`
  - `foxar/src/CoreCatsMetadataRenderer.sol`
  - `foxar/src/CoreCatsOnchainData.sol`
- [ ] Official token description
- [ ] Fixed supply / per-wallet rule
- [ ] Random assignment explanation
- [ ] Toolchain evidence:
  - `foxar/spark.toml`
  - `foxar/foxar.toml`
  - `.gitmodules`
- [ ] Deploy / post-deploy scripts:
  - `foxar/script/CoreCatsDeploy.s.sol`
  - `foxar/script/CoreCatsPostDeployCheck.s.sol`
- [ ] Mainnet manual verify packet:
  - `docs/verify_inputs/mainnet/VERIFY_SUBMISSION.md`
  - `docs/verify_inputs/mainnet/CoreCatsOnchainData.standard-input.json`
  - `docs/verify_inputs/mainnet/CoreCatsMetadataRenderer.standard-input.json`
  - `docs/verify_inputs/mainnet/CoreCats.standard-input.json`
  - `docs/verify_inputs/mainnet/CoreCatsMetadataRenderer.constructor-args.txt`
  - `docs/verify_inputs/mainnet/CoreCats.constructor-args.txt`
- [ ] Historical / official separation note:
  - `docs/HISTORICAL_MAINNET_REHEARSAL_CONTRACTS.md`

### repo 外で人が補完すべきもの

- [ ] Official site URL
- [ ] Explorer contract URL
- [ ] Explorer verified status
- [ ] Official deploy tx hash の explorer URL と live 照合
- [ ] Official renderer / data contract explorer URLs
- [ ] Official deploy に対応する commit SHA

### 備考

- repo には `docs/verify_inputs/mainnet/` があり、official mainnet verify packet として提出可能。
- `docs/verify_inputs/devin/` は **Devin 用**であり official mainnet packet とは別物。
- repo 上の official address / deploy tx は Blockindex 問い合わせの strong candidate になるが、**live explorer state は別途確認が必要**。
