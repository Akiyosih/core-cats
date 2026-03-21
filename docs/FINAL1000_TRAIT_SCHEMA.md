# Final 1000 Trait Schema

## 目的
active canonical manifest `manifests/final_1000_manifest_v2.json` の属性定義を固定し、UI表示・on-chain metadata・検証の解釈を統一する。

## 固定属性（5項目）
1. `Pattern`
2. `Color Variation` (`palette_id`)
3. `Collar` (`none` / `checkered_collar` / `classic_red_collar`)
4. `Rarity Tier` (`common` / `rare` / `superrare`)
5. `Rarity Type` (`none` / `odd_eyes` / `red_nose` / `blue_nose` / `glasses` / `sunglasses` / `beam`)

## superrare 固定ルール
- `Rarity Tier = superrare` の10体が対象。
- canonical selection の正本:
  - `manifests/superrare_beam_selection_v2.json`
  - `manifests/beam_token_reorder_v2.json`
- beam superrare は通常個体の見た目の構造を維持する:
  - `Pattern` は各 superrare の coat pattern をそのまま保持する
  - `Color Variation` は各 superrare の colorway をそのまま保持する
  - `Collar` は `none` / `checkered_collar` / `classic_red_collar` の通常値をそのまま保持する
  - `Rarity Type = beam`
- rare 由来の8体は rare trait を外したうえで beam superrare に昇格する。
- common 由来の2体は source common を残したまま beam superrare を別 token として新設する。
- 旧 `999 / 1000` 固定 superrare 予約は廃止する。
- 旧 logo-based superrare (`corelogo` / `pinglogo`) は廃止する。
- beam 導入前の historical canon は `manifests/final_1000_manifest_v1.json` として残す。

## 内部データとの切り分け
- canonical manifest item には内部検証用に `collar` 真偽値と `collar_type` が残る。
- ただし公開 metadata / viewer attributes では冗長な `with_collar` / `without_collar` を出さず、`Collar` を `none` / `checkered_collar` / `classic_red_collar` の1項目として扱う。

## Pattern / Color Variation と実画の関係
- `Pattern` は模様テンプレート名。
- `Color Variation` (`palette_id`) はカラーパレット系列名。
- ただし、見た目の最終色配置は `pattern` ごとのスロット構造により決まるため、`pattern + palette_id` だけで完全一意にはならない。
- 再現性は以下を併用して担保する:
  - `pattern`
  - `palette_id`
  - `color_tuple`
  - `variant_key`
  - `slots`
  - `layers_24`

## 実装上の正本
- current final rebuild:
  - `scripts/ui/rebuild_final1000_beam_outputs.mjs`
- current viewer build:
  - `scripts/ui/generate_viewer_data.mjs`
- current on-chain data generation:
  - `scripts/reference_eth/generate_onchain_data.py`

## 表示ラベル方針（内部IDと分離）
- 内部ID（manifestの値）は機械処理向けに固定する。
  - 例: `common`, `superrare`, `checkered_collar`
- UI表示ラベルは人間向けに変換して表示する。
  - `common` -> `Common`
  - `rare` -> `Rare`
  - `superrare` -> `Super Rare`
  - `checkered_collar` -> `Checkered Collar`
  - `classic_red_collar` -> `Classic Red Collar`
  - `odd_eyes` -> `Odd Eyes`
  - `red_nose` -> `Red Nose`
  - `blue_nose` -> `Blue Nose`
  - `beam` -> `Beam`
- 正式な表示ラベル定義: `manifests/trait_display_labels_v1.json`
