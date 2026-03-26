# `scripts/reference_eth/`

Archive-derived helper scripts imported from the historical `core-cats-eth` path.

These scripts remain in the active `core-cats` repository only when they still help:

1. regenerate packed on-chain data
2. compare current Core outputs against historical reference material
3. preserve the migration path transparently

Important boundary:

1. this directory is **not** the active deploy or mint path
2. these scripts may refer to historical `art/...` source paths that are **not fully mirrored** in this repository
3. outside readers should not interpret those references as proof that `core-cats` is meant to carry the complete historical PNG part library
4. the active repository's canonical outputs remain:
   - `manifests/`
   - `foxar/src/CoreCatsOnchainData.sol`
   - `foxar/src/CoreCatsMetadataRenderer.sol`
   - `manifests/viewer/`
5. the notable local asset exception is `assets/traits/beam.png`, which remains here because the current no-logo beam superrare path still uses that overlay directly

If full historical raster source art is needed, use the `core-cats-eth` archive as the reference source.
