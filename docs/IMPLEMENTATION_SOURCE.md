# Implementation Source Mapping

## Purpose
Clarify where active implementation and migration planning are maintained.

## Source of Truth
- Active implementation repository: `core-cats`
- GitHub: https://github.com/Akiyosih/core-cats
- Local path: `C:\Users\b8_q6\myproject\core-cats`

## Reference Archive (`core-cats-eth`)
- Role: frozen reference track and historical implementation log
- GitHub: https://github.com/Akiyosih/core-cats-eth
- Local path: `C:\Users\b8_q6\myproject\core-cats-eth`
- Latest reference commit: `f264140`

## Reference Documents (core-cats-eth)
- `docs/PROJECT_STATUS.md`
- `docs/ROADMAP_CORE_MIGRATION.md`
- `docs/WORK_PROCEDURE_CORE_BLOCKCHAIN.md`
- `docs/DECISIONS/ADR-0001-eth-first-strategy.md`
- `docs/DECISIONS/ADR-0002-randomness-strategy.md`

## Role of This Repository (`core-cats`)
- Core production-facing repository and active implementation track.
- Core testnet and mainnet deployment work is executed here.
- Includes imported reference implementation snippets under:
  - `contracts/reference_eth/`
  - `scripts/reference_eth/`

## Mirrored Artifact Snapshot (from `core-cats-eth`)
- Local path: `manifests/`
- Includes final 1000 manifests, validation/summary/audit outputs, and display-label mapping.
- Sync source commit (core-cats-eth): `f264140`
