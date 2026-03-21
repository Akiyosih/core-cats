# Core Cats Web Publication Policy

## Purpose
Define how the public website should be published and evolved from teaser viewing through mint opening and post-mint browsing.

This document is operational. It complements:
- `docs/WORK_PROCEDURE_CORE_BLOCKCHAIN.md`
- `docs/MAINNET_CLOSED_LAUNCH_RUNBOOK.md`
- `docs/WEB_UI_MINT_DAPP_SPEC.md`

## Current Repository Context
1. Active implementation repository is `core-cats`.
2. `core-cats-eth` is reference/archive only.
3. The current website lives in `web/` and is a Next.js application with server-side routes.
4. The current mint flow depends on CorePass session/callback handling and server-side signing/finalization support.
5. The eventual public mint target may still use the current `web/` application end-to-end.
6. However, browse/teaser publication and mint/canary publication may be split temporarily while resource-hardening and hosting recovery work is in progress.

## Web Role
The website exists to provide:
1. collection introduction
2. art viewing
3. transparency and verification links
4. mint guidance and wallet flow

The website is not the value center. The value center remains:
1. the Core contracts
2. the on-chain metadata
3. the on-chain SVG rendering

## Publication Principle
Website publication and public mint opening are separate actions.

The project may publish the website before mint opens, as long as mint remains logically closed.

This should follow the existing launch-state model:
1. `closed`
2. `canary`
3. `public`

## Temporary Recovery Split
If the public site is paused or resource-hardening work is still in progress, the project may temporarily split:

1. a public teaser/browse surface
2. a private canary mint surface

This temporary split is acceptable if all of the following remain true:
1. the public teaser surface keeps mint logically closed
2. the private canary surface is treated as operator validation, not public launch
3. the later public mint is still intended to open on the community-facing public site
4. the split is used to reduce cost/risk while hardening the browse surface, not to bypass the canary/public launch discipline

## Publication Phases
### 1. Viewing / Teaser Publication (`closed`)
Goal:
1. let the community inspect the art
2. explain the project
3. expose transparency and GitHub links
4. keep mint closed

Expected public pages:
1. `/`
2. `/about`
3. `/collection`
4. `/transparency`
5. `/mint` may remain visible, but must clearly indicate that mint is not open

Backend expectations:
1. no general public signature issuance
2. no public mint activity
3. no assumption that the live CorePass transaction path is open

### 2. Mainnet Validation Window (`closed` or `canary`)
Goal:
1. keep the intended public site live if that is operationally safe
2. deploy contracts
3. point the site at real mainnet addresses
4. perform canary validation without turning the site into a public mint immediately

Notes:
1. If the public teaser surface must remain browse-only during recovery, the active canary may instead run on a private operator-controlled origin.
2. That temporary private-canary stage does not remove the need to validate the final public mint origin before public opening.

### 3. Public Mint (`public`)
Goal:
1. open mint to the public
2. keep transparency links and contract references current
3. operate the CorePass mint backend during the live mint period

### 4. Post-Mint Viewing
Goal:
1. keep the same site live for browsing and transparency
2. close mint while preserving collection visibility

Expected behavior:
1. show `Mint Closed` or `Sold Out`
2. retain `/collection`, `/about`, `/transparency`
3. disable public signature issuance

## Hosting Policy
### Preferred Direction
Use a platform arrangement that keeps the browse surface cheap to publish and the mint surface explicit about when it is actually live.

Good fits:
1. Cloudflare Pages with the required runtime support
2. Vercel
3. another host that supports the current Next.js server-side shape
4. a temporary split where browse/teaser publication and private canary mint validation do not share one origin

### Important Constraint
The current `web/` is not best treated as a `github.io`-style static export.

Reason:
1. the app contains server-side mint routes
2. the app contains CorePass session/callback handling
3. the eventual public mint should preserve one consistent origin through teaser, canary, public mint, and post-mint viewing

### Static Export Note
A static-first teaser/browse publication path remains acceptable if:
1. the public surface keeps mint closed
2. live ownership can still be read from a separate public snapshot source
3. the mint/canary path is treated as a separate dynamic surface until public opening is ready

## Origin / Domain Policy
1. Origin stability matters.
2. CorePass callback and app-link behavior should not be forced to change hostnames between teaser and launch if avoidable.
3. If no custom domain is used, prefer one stable origin from teaser through public mint.
4. During recovery work, a separate private canary origin is acceptable as an interim measure.

Conclusion:
1. custom domain is not mandatory
2. unnecessary origin changes should be avoided
3. temporary private-canary split is allowed when it protects the long-lived public teaser surface

## Mint Backend Policy
During public mint, the required backend is not merely a signature endpoint.

The live mint backend includes:
1. CorePass session handling
2. callback handling
3. nonce / expiry / signature issuance
4. finalize relayer behavior
5. durable session storage

Therefore:
1. teaser publication can minimize backend exposure
2. live mint requires a real backend path
3. post-mint viewing can disable or remove general mint issuance again

## Current Chosen Deployment Shape
The long-term public mint target remains:

1. public site on Vercel
2. mint backend on the Contabo Linux server
3. SQLite as the first durable session store

This lets the project keep:

1. one stable public origin for the website
2. secrets and CLI execution off Vercel
3. the current Core signing/finalization path with minimal redesign

See `docs/MINT_BACKEND_ARCHITECTURE.md` for the backend-specific details.

## Current Recovery Direction
Because a public deployment may need resource-hardening before it can be left online cheaply for a long teaser period, the current recovery direction is:

1. prioritize a low-cost public teaser/browse surface
2. keep mint/canary validation on a private operator-controlled surface until the public browse surface is hardened
3. resume public mint later on the community-facing public site after canary and publication readiness both recover

## Superrare Publication Policy
The current official path uses beam-based no-logo superrares.

Implication:
1. no separate teaser-facing hide policy is required for superrare art
2. public teaser, collection, and transparency surfaces may show the canonical beam superrare tokens directly
3. if a degraded pilot display is ever needed, treat it as an explicit temporary presentation choice rather than as the default canonical/public state

## Practical Guidance
When implementing or updating the site:
1. treat teaser publication as the `closed` state of the current app
2. do not fork the main launch logic unless there is a concrete operational reason
3. keep the same site structure from teaser through mint where possible
4. publish the canonical beam superrare set directly unless a temporary pilot-only downgrade is explicitly chosen
5. keep transparency and GitHub links available before mint opens
6. prefer host/origin continuity for the eventual public mint
7. during recovery, it is acceptable to separate public teaser publication from private canary validation if that materially improves cost control or stability

## Decision Summary
1. The project may publish a teaser/viewing site before mint opens.
2. The eventual public mint should still open on the community-facing public site.
3. Until publication hardening is complete, the public teaser surface and private canary mint surface may be separate.
4. Public mint should be enabled later through launch-state changes and the live CorePass backend.
5. After mint closes, the browsing/transparency surface should remain online in the cheapest maintainable form.
6. The no-logo beam superrares can be shown on teaser-facing visuals without a separate branding gate.
