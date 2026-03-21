# CoreCats

Fully on-chain SVG pixel cats on Core Blockchain.

Official `CCAT` target:
1. `1000 total`
2. `3 per wallet`
3. free mint
4. no retained owner/admin mint authority
5. public promises limited to on-chain-verifiable guarantees and published evidence

Current public state:
1. the official `CCAT` release is not open yet
2. the repository already contains completed mainnet rehearsal evidence for the `CCATTEST` / `CCATTEST2` path
3. the remaining release work is the official `CCAT` deploy, exact-host smoke, and later public opening

## Start Here
- [Official CCAT Launch Principles](docs/OFFICIAL_CCAT_LAUNCH_PRINCIPLES.md)
- [Docs Index](docs/README.md)
- [Public Trust + Privacy Notes](docs/TRUST_AND_PRIVACY_SURFACE.md)
- [Mainnet Public Evidence Checklist](docs/MAINNET_PUBLIC_EVIDENCE_CHECKLIST.md)

Important distinction:
1. [Official CCAT Launch Principles](docs/OFFICIAL_CCAT_LAUNCH_PRINCIPLES.md) describes the intended final `CCAT` standard
2. rehearsal and current-state notes document evidence from the already-run canary path and should not be mistaken for the final official philosophy

## Preview
![Core Cats Preview Grid](docs/assets/core_cats_preview_grid_teaser.png)

Representative random sample grid from the current 1,000-cat artwork review set.

## Active Workspaces

| Workspace | Role |
| --- | --- |
| `foxar/` | active contract source, tests, deploy scripts |
| `web/` | mint application and Vercel-hosted mint surface |
| `web-public-teaser/` | Cloudflare-hosted browse-only public surface |
| `shared/public-site/` | browse UI shared by `web/` and `web-public-teaser/` |
| `mint-backend/` | Contabo-backed session, precheck, and finalize path |

Contract build and test work should be treated as `foxar/`-first, not repository-root-first.

## Review Paths

### External Review
- [Official CCAT Launch Principles](docs/OFFICIAL_CCAT_LAUNCH_PRINCIPLES.md)
- [Public Trust + Privacy Notes](docs/TRUST_AND_PRIVACY_SURFACE.md)
- [Mainnet Public Evidence Checklist](docs/MAINNET_PUBLIC_EVIDENCE_CHECKLIST.md)
- [Viewer Data Pipeline](docs/VIEWER_DATA_PIPELINE.md)

### Launch / Cutover
- [Core Blockchain Work Procedure / Launch Path](docs/WORK_PROCEDURE_CORE_BLOCKCHAIN.md)
- [Mainnet Closed Launch Runbook](docs/MAINNET_CLOSED_LAUNCH_RUNBOOK.md)
- [Vercel Mainnet Cutover Checklist](docs/VERCEL_MAINNET_CUTOVER_CHECKLIST.md)
- [Official CCAT Cutover Note](docs/OFFICIAL_CCAT_CUTOVER_NOTE.md)

### Rehearsal Evidence
- [CCATTEST Rehearsal Canary Plan](docs/CCATTEST_REHEARSAL_CANARY_PLAN.md)
- [CCATTEST2 Private Canary Preview](docs/CCATTEST2_PRIVATE_CANARY_PREVIEW.md)
- [Recent Worklogs](docs/worklogs/)

## Repository Boundaries
1. this repository is the active Core production path
2. `core-cats-eth` is a historical reference archive, not a parallel active implementation
3. `contracts/reference_eth/` and `scripts/reference_eth/` remain as clearly labeled imported reference material
4. final manifest and viewer artifacts live under `manifests/`

See:
- [Implementation Source Mapping](docs/IMPLEMENTATION_SOURCE.md)
- [Final 1000 Trait Schema](docs/FINAL1000_TRAIT_SCHEMA.md)
- [Manifest Notes](manifests/README.md)

## License
This project is licensed under the MIT License.
