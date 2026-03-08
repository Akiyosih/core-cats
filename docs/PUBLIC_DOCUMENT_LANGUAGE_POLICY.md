# Core Cats Public Document Language Policy

Status: working public-facing documentation policy

## Purpose
Define which language is authoritative for public Core Cats documentation.

## Canonical Public Language
English is the authoritative language for public Core Cats documentation.

This applies to:

1. `README.md`
2. public-facing policy notes in `docs/`
3. runbooks and launch-path notes intended for outside review
4. public website copy that explains the mint path, trust surface, or launch state

## Why This Policy Exists
The project wants public readers to have one canonical text.

This avoids:

1. update drift between parallel English/Japanese sections
2. small wording mismatches in trust/privacy/launch-policy statements
3. ambiguity about which wording controls when documents are updated quickly

## Translation Rule
Translations are optional convenience material, not the default source of truth.

If a public translation is added later, it should:

1. be in a separate file or clearly separated section
2. be labeled as non-authoritative convenience text
3. include a visible update date
4. point back to the English canonical version

The default public posture is not bilingual duplication inside the main canonical spec.

## Divergence Rule
If an English public document and a translation ever differ, the English version controls until the mismatch is corrected.

## Private Documentation
This policy does not require private local operator notes to be English-only.

Private working notes may remain in Japanese if that is operationally clearer for the operator.

## Practical Rule For This Repository
Current intended practice:

1. keep public repository docs English-first
2. avoid duplicating the same spec/policy text in both English and Japanese inside `README.md`
3. use separate translations only when there is a concrete audience need
4. keep `.private/` free to use Japanese where it improves operator clarity
