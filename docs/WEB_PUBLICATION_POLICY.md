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
5. Therefore, the current `web/` should be treated as a long-lived public application, not merely as a static teaser bundle.

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
1. keep the same public site live
2. deploy contracts
3. point the site at real mainnet addresses
4. perform canary validation without turning the site into a public mint immediately

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
Use a platform that can host the current Next.js app and its server-side routes without redesigning the stack.

Good fits:
1. Cloudflare Pages with the required runtime support
2. Vercel
3. another host that supports the current Next.js server-side shape

### Important Constraint
The current `web/` is not best treated as a `github.io`-style static export.

Reason:
1. the app contains server-side mint routes
2. the app contains CorePass session/callback handling
3. the site should preserve one consistent origin through teaser, canary, public mint, and post-mint viewing

### Static Export Note
A fully static teaser-only build remains possible in theory, but it should be treated as a separate derivative publication path, not as the default deployment of the current `web/`.

## Origin / Domain Policy
1. Origin stability matters.
2. CorePass callback and app-link behavior should not be forced to change hostnames between teaser and launch if avoidable.
3. If no custom domain is used, prefer one stable origin from teaser through public mint.

Conclusion:
1. custom domain is not mandatory
2. unnecessary origin changes should be avoided

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

## Logo-Bearing Superrare Policy
Until branding permission is clearly settled, the two logo-bearing cats should not be used in public teaser-facing materials.

This applies to:
1. homepage hero or curated preview
2. README preview image if it visibly includes them
3. teaser-facing collection showcases or promotional assets

Allowed alternatives:
1. substitute other cats in teaser-facing curation
2. use placeholder treatment if needed
3. keep the real token data in canonical manifests while excluding the visuals from teaser-facing publication

Important distinction:
1. this is a teaser/public-facing display policy
2. it does not automatically require canonical token metadata to change

## Practical Guidance
When implementing or updating the site:
1. treat teaser publication as the `closed` state of the current app
2. do not fork the main launch logic unless there is a concrete operational reason
3. keep the same site structure from teaser through mint where possible
4. if logo-bearing superrares are temporarily hidden, do so as a presentation-layer policy
5. keep transparency and GitHub links available before mint opens
6. prefer host/origin continuity over premature optimization for static-only hosting

## Decision Summary
1. The project may publish a teaser/viewing site before mint opens.
2. The current `web/` should be treated as the long-lived public site, not a throwaway teaser.
3. Public mint should be enabled later through launch-state changes and the live CorePass backend.
4. After mint closes, the same site should remain as the browsing/transparency surface.
5. Logo-bearing superrares should stay out of teaser-facing visuals until branding permission is clear.
