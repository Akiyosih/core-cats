# Core Cats Minter Privacy Note

Status: public-facing note for the current mint flow

## Short Version
The current Core Cats mint path should not be described as anonymous minting.

It is designed to avoid unnecessary KYC for the current release, but it still uses normal on-chain transactions plus a server-side mint session/backend flow.

## What The Current Launch Path Uses
The current launch target is the CorePass **Protocol-direct** path:

1. `corepass:sign`
2. `corepass:tx`

It does **not** currently depend on:

1. CorePass Connector Authorization
2. KYC-transfer
3. CTN as a launch prerequisite

## What Core Cats Does Not Intend To Collect For The Current Release
For the current protocol-direct mint path, Core Cats does not intend to require:

1. legal name
2. email address
3. postal address
4. government ID
5. Connector/KYC-transfer data

If a later release ever adopts Connector/KYC-transfer, that should be disclosed as a separate policy change before use.

## What Data Still Exists In Practice
The current mint system is still an application-backed flow.

Operationally, the current design may persist or observe:

1. a mint session id
2. the CoreID / minter address used in the session
3. requested quantity
4. commit transaction hash
5. finalize transaction hash
6. timestamps, status, and limited error/debug history needed for recovery

In addition:

1. commit/finalize transactions are public on-chain
2. ordinary hosting/provider/network metadata may exist outside the app itself

## Practical Privacy Expectation
The right expectation for minters today is:

1. no extra KYC should be required for the current release path
2. on-chain wallet activity is still public
3. the current mint flow is operational, not privacy-preserving in the anonymity sense

## Why The Project Publishes This Note
The goal is to avoid two opposite mistakes:

1. pretending the mint is anonymous when it is not
2. implying the project is collecting more personal data than the current launch path actually requires

## Public Reader Summary
If you mint through the current Core Cats flow:

1. expect a normal public blockchain transaction trail
2. expect a server-coordinated mint session
3. do not expect the current mint path to hide that a given CoreID/wallet participated
4. do expect the project to avoid unnecessary off-chain personal-data collection for this release
