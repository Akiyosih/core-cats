# manifests

Repository-tracked collection artifacts used for public review and reproducibility.

## Includes
1. final 1000 manifest snapshots
2. validation and summary outputs
3. trait display label mappings
4. active viewer data artifacts under `viewer/`

## Role
These files are published so outside readers can inspect:

1. the frozen collection inputs
2. the viewer-facing derived data
3. consistency outputs used during review

## Boundary Note
1. manifest layer/file references can include historical source-art path labels that remain useful for provenance and review
2. those labels should not be read as a guarantee that the full historical raster source tree is mirrored in this repository
3. the notable active local raster exception is `assets/traits/beam.png`, which is still used by the current no-logo beam superrare path
4. if a reviewer needs the broader historical PNG part library, the intended reference location is the `core-cats-eth` archive

## Related Docs
1. [Final 1000 Trait Schema](../docs/FINAL1000_TRAIT_SCHEMA.md)
2. [Viewer Data Pipeline](../docs/VIEWER_DATA_PIPELINE.md)
3. [Implementation Source Mapping](../docs/IMPLEMENTATION_SOURCE.md)
