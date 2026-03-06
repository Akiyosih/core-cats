# ADR-0002: Randomness Strategy for Mint Assignment (Core-first Release Path)

Date: 2026-03-06  
Status: Accepted

## Context
- Project target is Core Blockchain mainnet production.
- At this stage, the deployed Core rehearsal contract still uses sequential token assignment.
- Project invariants already require:
  - free mint
  - max 3 per wallet
  - transparent random assignment
  - no dependence on unconfirmed Core-native VRF availability

## Decision
- Adopt one baseline random assignment strategy for Core release work:
  - `commit-reveal + future blockhash + non-repeating draw (lazy Fisher-Yates)`
- Keep token semantics stable by assigning a random available `tokenId` directly at reveal time.
  - `tokenId` remains the canonical art identity.
  - No separate `artId -> tokenId` remap layer is introduced in this step.
- Use a two-step mint flow:
  1. `commitMint(...)`
  2. `revealMint(secret)`
- Keep signature-gated mint authorization and per-wallet limit checks independent from the random source.

## Rationale
- Preserves the existing `tokenURI(tokenId)` / renderer contract shape.
- Avoids introducing a second mapping layer unless it becomes necessary later.
- Keeps assignment auditable from public chain data plus user reveal secret.
- Matches the previously accepted project rule without adding a VRF dependency.

## Consequences
### Positive
- Random assignment can be replayed and audited.
- Existing fully on-chain renderer remains valid.
- Wallet limit and signature checks stay straightforward.

### Trade-offs
- Mint UX becomes a two-step flow.
- Commit expiry and reservation cleanup must be implemented carefully.
- Frontend must explain commit/reveal clearly.

## Guardrails
- Commit must reserve supply before reveal to avoid overcommit.
- Reveal must use a future blockhash with a bounded reveal window.
- Contract must emit enough events for replay verification.
- Assignment must be non-repeating and stay within `1..1000`.

## Follow-up Actions
- Implement commit/reveal mint flow in `foxar/src/CoreCats.sol`.
- Add tests for:
  - quantity handling (`1/2/3`)
  - reveal timing
  - expired commit cleanup
  - non-repeating assignment
  - signature/replay checks under the new interface
