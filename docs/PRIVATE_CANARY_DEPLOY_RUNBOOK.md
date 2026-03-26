# Private Canary Deploy Runbook

Purpose:
1. reopen the mint rehearsal on a private operator-controlled origin
2. keep the community-facing teaser site browse-only
3. make the canary host easy to retire once the public mint surface is ready

If the canary should run on a stable Vercel alias while the official public mint host stays untouched, use
`docs/CCATTEST2_PRIVATE_CANARY_PREVIEW.md` first. This runbook remains the self-hosted / Contabo-oriented path.

Reference URLs:
1. Core Blockchain project surface: https://coreblockchain.net/
2. Foxar toolchain intro: https://foxar.dev/intro/
3. Cloudflare Pages static teaser runbook: `docs/CLOUDFLARE_PUBLIC_TEASER_RUNBOOK.md`
4. Caddy `basic_auth` directive: https://caddyserver.com/docs/caddyfile/directives/basic_auth
5. Caddy `reverse_proxy` directive: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
6. Next.js 16 upgrade/runtime requirements: https://nextjs.org/docs/app/guides/upgrading/version-16

## Target Surface

Use the main `web/` app with:

1. `NEXT_PUBLIC_LAUNCH_STATE=canary`
2. `NEXT_PUBLIC_SITE_SURFACE=private-canary`
3. proxy backend mode enabled

This surface is for operator-led validation only.

## Environment

Start from:

`web/.env.private-canary.example`

Minimum required values:

```bash
NEXT_PUBLIC_LAUNCH_STATE=canary
NEXT_PUBLIC_SITE_SURFACE=private-canary
NEXT_PUBLIC_SITE_BASE_URL=https://replace-with-private-canary-origin
NEXT_PUBLIC_CORE_CHAIN_ID=1
CORE_NETWORK_ID=1
CORE_NETWORK_NAME=mainnet
NEXT_PUBLIC_CORE_EXPLORER_BASE_URL=https://blockindex.net
NEXT_PUBLIC_CORECATS_ADDRESS=replace-with-current-mainnet-rehearsal-corecats-address
CORECATS_BACKEND_MODE=proxy
CORECATS_INTERNAL_BACKEND_BASE_URL=http://127.0.0.1:8787
CORECATS_BACKEND_SHARED_SECRET=replace-with-the-same-random-secret-as-the-backend
CORECATS_RELAYER_ENABLED=true
```

Notes:
1. the private canary host should not reuse the public teaser origin
2. if the web app and backend share the same Contabo host, prefer `CORECATS_INTERNAL_BACKEND_BASE_URL=http://127.0.0.1:8787`
3. if the canary web app is hosted elsewhere, set `CORECATS_BACKEND_BASE_URL=https://...` instead
4. `NEXT_PUBLIC_CORECATS_PUBLIC_API_BASE_URL` is optional on the private canary host, but keeping it set is useful for `/collection`, `/cats/[tokenId]`, and `/my-cats`

## Repo-Side Files

Relevant files:
1. app env example: `web/.env.private-canary.example`
2. Contabo env example: `web/systemd/corecats-private-canary-web.env.example`
3. systemd unit example: `web/systemd/corecats-private-canary-web.service.example`
4. Caddy example: `web/reverse-proxy/Caddyfile.private-canary.example`

## Recommended Access Policy

Recommended default:
1. separate hostname from the public teaser
2. Basic Auth or equivalent edge restriction
3. no public navigation link from the teaser site
4. `X-Robots-Tag` / `robots` should keep the host out of search indexing

The app now emits `noindex` metadata and `robots.txt` rules when `NEXT_PUBLIC_SITE_SURFACE=private-canary`.

## Build / Verification

From `core-cats/web`:

```bash
npm install
node --test ./scripts/check-production-env.test.mjs
npm run build
```

Runtime prerequisite:
1. use Node.js `20.9+` for `next build` and `next start`
2. current Contabo private-canary runtime is Node.js 22
3. if the host is still on Node.js 18, upgrade the runtime before attempting a rebuild or restart

Before deployment:
1. stage the target env in a local file
2. run `node ./scripts/check-production-env.mjs ./.env.production.local`
3. confirm the output resolves to `private-canary`

## Contabo Default Deployment

Recommended default when the existing Contabo host is used:

1. copy `core-cats/web/systemd/corecats-private-canary-web.env.example` to `<private-canary-env-file>`
2. set:
   - `NEXT_PUBLIC_SITE_BASE_URL=https://<private-canary-origin>`
   - `CORECATS_BACKEND_SHARED_SECRET=<same-secret-as-backend>`
   - `NEXT_PUBLIC_CORECATS_PUBLIC_API_BASE_URL=<public-api-base-url>` if browse pages should show ownership
3. keep `CORECATS_INTERNAL_BACKEND_BASE_URL=http://127.0.0.1:8787`
4. set file permissions:
   - `chmod 600 <private-canary-env-file>`
5. install the systemd unit:
   - `cp <repo-root>/web/systemd/corecats-private-canary-web.service.example <private-canary-systemd-unit-file>`
   - `systemctl daemon-reload`
   - `systemctl enable --now corecats-private-canary-web`
6. install the Caddy config:
   - `cp <repo-root>/web/reverse-proxy/Caddyfile.private-canary.example <caddy-config-file>`
   - replace `canary.example.com`
   - replace `REPLACE_WITH_BCRYPT_HASH`
   - keep `/api/mint/corepass/callback/*` outside Basic Auth so CorePass can reach the callback URL
   - do not rewrite callback redirects to `localhost` or any internal host; the canary origin must round-trip back to the same external host users opened
   - `systemctl reload caddy`

## Canary-Specific Checks

After deployment:
1. `/` shows the private rehearsal notice
2. `/mint` is live and can create a session
3. `/robots.txt` disallows all indexing
4. page source contains `noindex`
5. callback URLs use the private canary origin, not the public teaser origin
6. QR 1 callback reaches the app and produces QR 2 without requiring Basic Auth inside CorePass
7. callback redirects never point to `localhost` or another internal host
8. `/transparency` shows `Site surface: private-canary`

## Exit Condition

This host is temporary.

Once:
1. browse/static hardening is complete
2. the final public mint origin has been revalidated
3. the launch state is ready to advance to `public`

the community-facing site can reopen mint and this private canary host can be retired.
