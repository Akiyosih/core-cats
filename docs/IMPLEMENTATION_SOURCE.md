# Implementation Source Mapping

## Purpose
Clarify where active implementation and migration planning are maintained.

## Source of Truth
- Active implementation repository: `core-cats`
- GitHub: https://github.com/Akiyosih/core-cats
- Local path: `C:\Users\b8_q6\myproject\core-cats`
- Historical contract path ADR: `docs/DECISIONS/ADR-0001-core-toolchain-priority.md`
- Current execution procedure: `docs/WORK_PROCEDURE_CORE_BLOCKCHAIN.md`

## Reference Archive (`core-cats-eth`)
- Role: frozen reference track and historical implementation log
- GitHub: https://github.com/Akiyosih/core-cats-eth
- Local path: `C:\Users\b8_q6\myproject\core-cats-eth`
- Latest reference commit: `cae76d3`

## Mainnet Release Clarity Policy
The project should keep `core-cats-eth` as a historical archive by default, not silently delete it.

Reason:
1. it preserves the ETH rehearsal and migration history
2. it explains how the project arrived at the current Core-first implementation
3. it is more transparent than pretending the detour never existed

However, public readers should not be asked to guess which repository is current.

Before or at the first real public mainnet release:
1. ensure all production-facing docs, runbooks, and transparency notes needed for outside review exist in `core-cats`
2. reduce `core-cats` public navigation so `core-cats-eth` is presented only as an archive/historical reference, not a parallel active repo
3. update the top-level `core-cats-eth` GitHub-facing messaging so the first screen clearly says:
   - historical ETH rehearsal archive
   - not the active implementation
   - current production path is `core-cats`
4. if no further updates are expected, consider GitHub archive mode for `core-cats-eth` after the above messaging is in place

Default recommendation:
1. keep the history
2. demote it operationally
3. avoid deleting it unless there is a separate legal/security reason

## Reference Documents (core-cats-eth)
- `docs/PROJECT_STATUS.md`
- `docs/ROADMAP_CORE_MIGRATION.md`
- `docs/WORK_PROCEDURE_CORE_BLOCKCHAIN.md`
- `docs/DECISIONS/ADR-0001-eth-first-strategy.md`
- `docs/DECISIONS/ADR-0002-randomness-strategy.md`
- `README.md` (Repository Mode section)

## Role of This Repository (`core-cats`)
- Core production-facing repository and active implementation track.
- Core testnet and mainnet deployment work is executed here.
- Active contract source/build/deploy workspace: `foxar/`
- Active mint backend workspace: `mint-backend/`
- Active web/publication workspace: `web/`
- Direct Core implementation has already succeeded on the active path.
- Current remaining work is:
  - mainnet readiness
  - web publication
  - mainnet closed launch
  - canary validation
  - public launch
- Root-level `contracts/` no longer carries a parallel legacy launch implementation.
- Imported archive/reference snippets remain under:
  - `contracts/reference_eth/`
  - `scripts/reference_eth/`

## Repository Clarity Rule
Public readers should not be asked to guess between multiple deploy paths in the same repository.

Therefore:
1. active Core launch code should live under the documented workspaces above
2. archive/reference imports may remain when they are explicitly labeled
3. obsolete legacy deploy scripts and starter-template files should be removed once they are no longer part of the active path

## Mirrored Artifact Snapshot (from `core-cats-eth`)
- Local path: `manifests/`
- Includes final 1000 manifests, validation/summary/audit outputs, and display-label mapping.
- Sync source commit (core-cats-eth): `f264140` (implementation payload baseline)
