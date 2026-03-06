# ADR-0001: Core Toolchain Priority (A -> B -> C)

Date: 2026-03-05  
Status: Accepted (Highest Priority)

## Context
- Final target is Core Blockchain mainnet deployment for Core Cats.
- Full on-chain NFT behavior (on-chain SVG + metadata + transparent random assignment) is already defined.
- Historically, direct progress could stall when compiler/toolchain compatibility is insufficient.
- We need one deterministic execution order that any future Codex/LLM can follow without ambiguity.

## Decision
From now on, Core deployment work must follow this strict priority order:

1. A: CoreZeppelin direct implementation first.
2. B: External solc operation second.
3. C: Self-implemented minimal ERC-721-compatible core third.

Do not start from B or C unless the previous step is explicitly documented as blocked.

## Definition of A / B / C
### A. CoreZeppelin direct implementation
- Use Core ecosystem-compatible OpenZeppelin line (CoreZeppelin) as first choice.
- Goal: keep standard library alignment while compiling/deploying on Core toolchain.

### B. External solc operation
- Compile contracts with external `solc` (compatible version), then run deploy/verify flow for Core environment.
- Goal: bypass compiler mismatch while preserving contract semantics from A.

### C. Self-implemented minimal core
- Implement minimal ERC-721-compatible logic in-house only if A/B are both blocked.
- Goal: preserve launch viability with smallest safe surface.

## Switching Rule (Mandatory)
- A -> B switch requires recorded evidence of A-blocker.
- B -> C switch requires recorded evidence of B-blocker.
- Evidence must be committed as reproducible logs/notes in this repository.

## Guardrails
- Keep NFT semantics unchanged across A/B/C:
  - same final 1000 manifest interpretation
  - same tokenURI/on-chain SVG output expectations
  - same randomness policy (`commit-finalize + future blockhash + lazy Fisher-Yates`)
- Keep external interfaces stable where possible (`mint`, `tokenURI`, ownership behavior, events).
- Record any unavoidable drift with explicit rationale and test impact.

## Consequences
### Positive
- Shortest path to Core mainnet while controlling migration risk.
- Lower chance of wasted work from premature fallback.
- Clear hand-off for future automated agents.

### Trade-offs
- Requires disciplined blocker logging before path switching.
- May temporarily keep parallel compatibility branches.

## Operational Note for Future Codex/LLM Sessions
- Treat this ADR as authoritative execution order for Core contract delivery.
- Before proposing implementation work, check current stage in `docs/WORK_PROCEDURE_CORE_BLOCKCHAIN.md`.
