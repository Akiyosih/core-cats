# Core Cats Web

Next.js frontend foundation for the Core Cats public web UI.

## Commands

From `core-cats/web`:

```bash
npm install
npm run dev
npm run build
```

## Current Scope

Implemented routes:
1. `/`
2. `/about`
3. `/collection`
4. `/cats/[tokenId]`
5. `/transparency`
6. `/mint` (status placeholder)
7. `/my-cats` (status placeholder)

## Data Source

The web app reads repository viewer data generated from:

`../manifests/viewer_v1/`

If the collection viewer data needs regeneration, run from the repository root:

```bash
node scripts/ui/generate_viewer_data.mjs
```
