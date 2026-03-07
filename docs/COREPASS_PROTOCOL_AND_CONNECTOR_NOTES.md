# CorePass Protocol vs Connector Notes

Status: Working launch note for current Core Cats mainnet planning

## Short Conclusion
1. The current Core Cats launch target is the CorePass **Protocol-direct** path:
   - `corepass:sign`
   - `corepass:tx`
2. The current launch target does **not** depend on CorePass Connector Authorization / KYC-transfer.
3. For the current launch target, the practical funding requirement is **XCB**.
4. **CTN should not be treated as a launch prerequisite** for the current Protocol-direct mint flow.
5. CTN should be revisited only if the project later adopts Connector-based Authorization / KYC-transfer.

## What The Current Core Cats Implementation Uses
The current `core-cats` implementation uses CorePass as:
1. a signature transport for session binding
2. a transaction transport for `commitMint(...)`
3. a manual fallback transaction transport for `finalizeMint(minter)` when relayer finalize is unavailable

Relevant local references:
1. `docs/WEB_UI_MINT_DAPP_SPEC.md`
2. `web/components/mint-workflow.jsx`
3. `web/lib/server/corepass-mint-sessions.js`

This means the active mint path is based on CorePass **Protocol** requests, not Connector Authorization.

## What The Public CorePass Protocol Docs Cover
Public protocol docs define:
1. `corepass:sign`
2. `corepass:tx`

These are the capabilities needed for the current Core Cats mint flow.

Source:
1. https://docs.corepass.net/corepass-protocol/

Operational reading:
1. `corepass:sign` is a signing request.
2. `corepass:tx` is a transaction request containing fields such as:
   - `to`
   - `data`
   - `val`
   - `ep`
   - `el`
   - `nc`
3. The protocol docs do not state that CTN is required for these protocol-direct operations.

## Where CTN Appears In The Public Docs
CTN appears in the **Connector Authorization / KYC-transfer** documentation.

Source:
1. https://docs.corepass.net/corepass-connector/authorization/

Important public-doc signals:
1. The KYC-transfer flow is described as acquiring user KYC data in exchange for Core Token.
2. The docs explicitly state that each such request costs CTN.

Practical reading:
1. If Core Cats adopts Connector Authorization / KYC-transfer, CTN may become operationally relevant.
2. If Core Cats stays on the current Protocol-direct launch path, CTN is not currently a required launch asset.

## KYC-Gating Ambition vs Current Public Reality
Desired long-term goal:
1. allow mint only for users who are KYC-verified
2. avoid collecting unnecessary personal data
3. ideally rely on a minimal yes/no proof of verified status

Current public-doc reality:
1. The public Connector Authorization docs clearly document a KYC-transfer flow.
2. They do not clearly document a production-ready, zero-knowledge, boolean-only public mint gating pattern that can safely be treated as the current release path.
3. They do document a `verified` check and then a KYC-transfer flow, but the public docs do not justify treating that as a ready-to-launch minimal-KYC gating product for Core Cats today.

Source:
1. https://docs.corepass.net/corepass-connector/authorization/

Working judgment:
1. KYC-gated mint remains an attractive future goal.
2. It should not be treated as a current launch blocker.
3. It should be revisited around mainnet canary timing, when docs/app support may be clearer.

## Mainnet Readiness Judgment
The current strongest judgment is:
1. Protocol-direct CorePass mint is the correct release target now.
2. Connector/KYC-transfer is a later optional expansion, not a current dependency.
3. Mainnet canary should validate:
   - `corepass:sign`
   - `corepass:tx`
   - XCB-funded commit/finalize behavior
4. At that same stage, the team may re-check whether Connector/KYC-transfer and any CTN requirement have become clear enough to pursue the ideal KYC-only launch policy.

## Funding Implication
For the current launch path:
1. Required asset: **XCB**
2. Not currently required as a launch prerequisite: **CTN**

This affects wallet planning:
1. deployment wallets need XCB
2. relayer wallet needs XCB
3. canary minter wallet needs XCB
4. a separate funding wallet may collect and distribute XCB

## Related Notes
1. `docs/COREPASS_TESTNET_STATUS.md`
2. `docs/MAINNET_CLOSED_LAUNCH_RUNBOOK.md`
3. `docs/MINT_BACKEND_ARCHITECTURE.md`
4. `/mnt/c/Users/b8_q6/myproject/.private/core-cats-mainnet-ops.md`
