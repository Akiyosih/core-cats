# CCATTEST2 Private Canary Preview

Purpose:
1. keep `core-cats-mint.vercel.app` reserved for the official public mint
2. run `CCATTEST2` on a separate stable canary-only host
3. avoid sharing a raw preview deployment URL with outside testers

Reference URLs:
1. Core Blockchain project surface: https://coreblockchain.net/
2. Foxar toolchain intro: https://foxar.dev/intro/
3. Vercel aliases: https://vercel.com/docs/domains/working-with-domains/vercel-domains
4. Vercel preview environments: https://vercel.com/docs/deployments/pre-production#preview-environment-variables

## Separation Goal

Use one Vercel project with two operational surfaces:
1. Production:
   - official host only
   - `NEXT_PUBLIC_SITE_SURFACE=public-mint`
   - `NEXT_PUBLIC_LAUNCH_STATE=closed/public`
2. Preview:
   - `CCATTEST2` private canary only
   - `NEXT_PUBLIC_SITE_SURFACE=private-canary`
   - `NEXT_PUBLIC_LAUNCH_STATE=canary`

Do not put `CCATTEST2` values into the Vercel Production environment.

## Recommended Host Shape

Use a stable canary-only alias such as:

`https://replace-with-stable-private-canary-origin`

Rules:
1. do not reuse `core-cats-mint.vercel.app`
2. do not send testers to a raw preview deployment URL
3. set `NEXT_PUBLIC_SITE_BASE_URL` to the stable canary alias
4. after each preview deploy, move the alias to the latest ready preview deployment

## Preview Environment Values

Start from `web/.env.private-canary.example`.

Minimum Preview env:

```bash
NEXT_PUBLIC_LAUNCH_STATE=canary
NEXT_PUBLIC_SITE_SURFACE=private-canary
NEXT_PUBLIC_SITE_BASE_URL=https://replace-with-stable-private-canary-origin
NEXT_PUBLIC_CORECATS_MINT_ONLY_HOST=1
NEXT_PUBLIC_CORECATS_BROWSE_BASE_URL=https://replace-with-cloudflare-browse-origin
NEXT_PUBLIC_CORE_CHAIN_ID=1
CORE_NETWORK_ID=1
CORE_NETWORK_NAME=mainnet
NEXT_PUBLIC_CORE_EXPLORER_BASE_URL=https://blockindex.net
NEXT_PUBLIC_CORECATS_ADDRESS=replace-with-current-mainnet-rehearsal-corecats-address
NEXT_PUBLIC_PRIVATE_CANARY_BADGE_TEXT=PRIVATE CANARY
NEXT_PUBLIC_PRIVATE_CANARY_TITLE_TEXT=CCATTEST2 MAINNET TEST
NEXT_PUBLIC_PRIVATE_CANARY_WARNING_TEXT=NOT PUBLIC MINT
NEXT_PUBLIC_PRIVATE_CANARY_ENFORCE_CANONICAL_HOST=1
CORECATS_BACKEND_MODE=proxy
CORECATS_BACKEND_BASE_URL=https://replace-with-contabo-backend-origin
CORECATS_BACKEND_SHARED_SECRET=replace-with-the-same-random-secret-as-the-backend
CORECATS_RELAYER_ENABLED=true
NEXT_PUBLIC_CORECATS_STATUS_URL=https://replace-with-public-status-origin/api/public/status
```

Notes:
1. `NEXT_PUBLIC_CORECATS_MINT_ONLY_HOST=1` keeps the canary host focused on mint
2. `NEXT_PUBLIC_CORECATS_BROWSE_BASE_URL` should point back to the browse host
3. `NEXT_PUBLIC_PRIVATE_CANARY_ENFORCE_CANONICAL_HOST=1` redirects page traffic from raw preview URLs to the stable alias, but does not touch `/api/*`
4. the app already emits `noindex` metadata and `robots.txt` disallow rules on `private-canary`

## Do Not Put These In Production

Do not set these Production values for the official host:
1. `NEXT_PUBLIC_SITE_SURFACE=private-canary`
2. `NEXT_PUBLIC_LAUNCH_STATE=canary`
3. `NEXT_PUBLIC_CORECATS_ADDRESS=<CCATTEST2 address>`
4. `NEXT_PUBLIC_PRIVATE_CANARY_*`
5. `NEXT_PUBLIC_SITE_BASE_URL=https://replace-with-stable-private-canary-origin`

The official production host should remain pointed at the official `CCAT` path only.

## Vercel Manual Steps

1. Keep Production env reserved for the official host.
2. Put the values above into the Preview environment only.
3. Deploy a preview build from the intended branch/commit.
4. Assign the stable canary alias to that preview deployment.
5. If another preview deploy replaces it, move the alias again.
6. If any Vercel protection layer is enabled, verify that CorePass can still reach `/api/mint/corepass/callback/*`.

Recommended verification after alias assignment:
1. open the stable canary alias, not the raw preview URL
2. confirm the page says:
   - `PRIVATE CANARY`
   - `CCATTEST2 MAINNET TEST`
   - `NOT PUBLIC MINT`
3. confirm page source contains `noindex`
4. confirm `/robots.txt` disallows crawling

## Contabo Backend Values

Backend-side requirements do not change shape for this canary host.

Confirm on Contabo:
1. `CORECATS_ADDRESS=<CCATTEST2 address>`
2. `CORECATS_BACKEND_SHARED_SECRET=<same value as Vercel Preview>`
3. finalizer/relayer settings are valid for the canary contract
4. `/api/public/status` returns the canary contract address

## Deploy Checks

Before sharing the canary URL:
1. run `node ./scripts/check-production-env.mjs ./.env.private-canary.local`
2. confirm:
   - `launch_state=canary`
   - `site_surface=private-canary`
3. run `npm run build`
4. confirm the root `/` serves the mint entry on the private canary host
5. confirm non-mint browse links hand off to the browse origin

## Mint Smoke Test

1. open the stable canary alias
2. start a CorePass mint session from `/`
3. confirm QR 1 / app-link callback returns to the same canary alias
4. confirm QR 2 / commit callback returns to the same canary alias
5. confirm finalize completes against the `CCATTEST2` contract
6. confirm `/transparency` and explorer links point at `CCATTEST2`, not the official production contract

## Known CorePass Constraints

1. if the tester has multiple CorePass accounts derived from the same seed phrase and wants to mint with a wallet other than the default / active one, `QR 1 of 2` should be scanned with the CorePass in-app QR scanner
2. device standard camera entry and same-device mobile entry should not be treated as reliable evidence for selecting a non-default same-seed wallet
3. when the browser rejects an over-cap request before `QR 2 of 2`, CorePass may still show a generic `Connection unsuccessful` message even though the browser displays the correct refusal reason
4. treat the browser-side mint state as the authoritative error surface for those pre-commit rejections

## Retirement

After the private canary is no longer needed:
1. remove the stable canary alias from the preview deployment
2. clear `CCATTEST2` preview-only values from Vercel Preview env if they are no longer needed
3. leave `core-cats-mint.vercel.app` untouched
4. keep any public evidence/worklog separate from the official `CCAT` launch record
