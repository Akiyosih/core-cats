# core-cats Agent Rules

## Owner

This repository owns the active Core Cats production path:

- Core Blockchain / core-coin contract source, deployment evidence, and runbooks
- public mint and browse surfaces
- current public documentation for CCAT
- maintenance of already-launched Core Cats assets and web surfaces

`core-cats-eth` is historical reference, not the active implementation.

## Required Reading

Before editing this repo:

1. Read `/mnt/c/Users/b8_q6/myproject/AGENTS.md`.
2. Read this file.
3. Read `README.md`.
4. Check `git status --short`.

## Chain Reference Rule

- For this project, "Core Blockchain" refers to the `core-coin` ecosystem.
- Do not mix chain assumptions from unrelated ecosystems.
- If chain-level settings are uncertain, stop and ask before changing code/docs.

## Preferred Source Family For Core-Chain Work

- https://coreblockchain.net/
- https://foxar.dev/intro/
- https://github.com/core-coin
- https://github.com/core-coin/ylem
- https://github.com/bchainhub

## Working Requirement

- When modifying deployment/network/compiler settings, include the source URL in
  the commit message or nearby docs.

## Documentation Boundary Rule

Public repository content should contain only:

- code and tests
- behavior/spec documentation
- deploy/verify evidence
- trust-boundary explanations
- non-sensitive runtime interface names

Keep the following in private local notes such as `.private/core-cats-mainnet-ops.md`:

- wallet numbering tied to current operations
- operator wallet addresses unless they are intentionally published as public evidence
- funding status and tx hashes
- secret handoff timing and courier paths
- machine assignment (`PC1` / `PC2`) and local risk posture
- server hostnames, IPs, local filesystem paths, and live runtime snapshots

Do not place the following in the public repository unless there is a clear user-approved reason:

- private keys, seed phrases, passwords, shared secrets
- raw secret material examples copied from real operations
- real operator addresses in test fixtures when a dummy value is sufficient
- operator-specific security posture that does not improve third-party verification

If unsure whether something belongs in public docs, prefer:

- generic role-based wording in public docs
- concrete operator detail in `.private/`

