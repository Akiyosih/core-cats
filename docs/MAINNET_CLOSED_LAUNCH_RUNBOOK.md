# Core Cats Mainnet Closed Launch Runbook

Last updated: 2026-03-06
Status: Draft for the current `main` branch

## Purpose
Provide the operational sequence from "web is publicly reachable" to "mint is publicly open" without skipping a controlled mainnet canary.

## 1. Launch Model
The project should use three operational states for mint:

1. `closed`
   - website is public
   - collection/about/transparency are public
   - mint page is visible
   - general signature issuance is off
   - only operator-controlled testing may be allowed
2. `canary`
   - mainnet contracts are deployed
   - mint is live only for a small allowlist
   - goal is validation, not public release
3. `public`
   - general signature issuance is open
   - normal rate limits and wallet limits apply

Website publication and mint opening are separate actions.

## 2. Preconditions
Before mainnet launch work begins:

1. `main` contains the intended production contracts and web app structure.
2. Final 1000 manifest and trait schema are frozen in repository artifacts.
3. Production roles are separated:
   - deployer key
   - mint signer key
   - finalizer/relayer key
4. Mainnet deploy inputs are prepared:
   - constructor args
   - verify packet
   - worklog template
5. CorePass callback/app-link base URL is fixed for the production site.
6. CorePass mint session storage is durable enough for real mainnet use.

## 3. Web Publication Before Mint
Publish the public web app first.

Required site behavior:
1. `/`, `/about`, `/collection`, and `/transparency` are public.
2. `/mint` is public but clearly marked `closed`.
3. No public signature issuance occurs while closed.
4. Transparency page can show:
   - "mainnet deployment pending" before deploy
   - then switch to the real contract addresses after deploy

The point of this step is to stabilize:
1. domain
2. callback routes
3. CorePass QR/app-link behavior
4. public copy and transparency links

## 4. Mainnet Closed Launch Checklist
Run these steps in order.

1. Confirm launch state is `closed`.
2. Deploy:
   - `CoreCatsOnchainData`
   - `CoreCatsMetadataRenderer`
   - `CoreCats`
3. Record:
   - deployer address
   - contract addresses
   - deployment tx hashes
   - commit SHA
4. Attempt explorer verification.
   - if automated verify works, record links
   - if not, submit or stage the manual verify packet
5. Update the public site with:
   - mainnet contract addresses
   - explorer links
   - verify status
6. Confirm signer and finalizer configuration is pointed at mainnet, not Devin.
7. Keep public signature issuance disabled.

## 5. Canary Mint Checklist
This is the first real production-path mint.

### Minimum canary
1. Restrict signature issuance to one operator wallet.
2. Start from the public production web app.
3. Run the intended wallet flow:
   - CorePass sign
   - CorePass commit tx
   - relayer finalize or manual finalize fallback
4. Confirm:
   - callback/app-link returns correctly
   - commit tx is visible on explorer
   - finalize tx is visible on explorer
   - assigned token exists
   - `tokenURI(tokenId)` decodes to on-chain JSON/SVG
   - collection/transparency pages point at the correct mainnet data
5. Write a worklog with the canary result.

### Quantity policy
1. If the first public launch will expose quantity `1 / 2 / 3`, do not assume quantity `1` is enough.
2. Either:
   - run an additional canary for multi-quantity mint, or
   - temporarily expose only quantity `1` on the public site until multi-quantity is confirmed

## 6. Go / No-Go Rules
Move from `closed` to `canary` only if:
1. mainnet contracts are deployed
2. contract addresses are recorded
3. production site is reachable
4. signer/finalizer config is correct

Move from `canary` to `public` only if:
1. at least one full canary mint succeeds
2. the intended production wallet flow is proven
3. explorer and transparency links are correct
4. token readback is correct
5. quantity exposure matches what has actually been validated

Do not move to `public` if:
1. CorePass callback/app-link is unstable
2. finalize backlog is unresolved
3. signer issuance is misconfigured
4. site is still pointing at Devin/testnet data anywhere important

## 7. Public Launch Checklist
After canary success:

1. Change launch state to `public`.
2. Open general signature issuance.
3. Keep rate limiting, nonce, and expiry enforcement active.
4. Keep relayer/finalize monitoring active.
5. Publish:
   - contract addresses
   - verify links or verify status
   - GitHub repository links
   - reproducibility docs

## 8. Evidence To Save
For closed launch and canary:

1. deploy tx hashes
2. contract addresses
3. canary commit tx hash
4. canary finalize tx hash
5. assigned token id
6. decoded `tokenURI` evidence
7. any verify submission link or packet path
8. a worklog entry in `docs/worklogs/`
