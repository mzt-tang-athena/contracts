---
title: Light contracts for notes, references and waypoints
created: 2026-11-26
priority: normal
assignee: opencode
pr: 28
depends: [20261126-vault-writing-standards]
---

## Spec

ADR `20261126-vault-writing-standards` covered tasks, deeds, lists,
agent notes and the journal, and left three kinds for later: the ones
the operator writes. The operator decided on 2026-11-26 that they stay
light. Only `kind` is required, so `created` is not required on them.
The contracts exist mainly to stop an agent writing a malformed note,
because the hooks never block the operator.

- Add `noteFrontmatter`, `referenceFrontmatter` and
  `waypointFrontmatter`, built and exported like `agentFrontmatter`.
  Each reads the bare and link forms of `kind`, and keeps every unknown
  property.
- `categories`, `types`, `related` and `cover` are a link or a link
  list, in the vault's quoted form, and parse to links.
- Wire the three kinds into `vault-check`. A malformed one is an error
  under `--agent` and a warning otherwise, so the operator is never
  blocked.
- No existing note fails. A sweep of the live vault exits 0.

## Acceptance

- [x] A notes, references or waypoints note passes with `kind` alone.
- [x] Each kind accepts the bare and link kind forms.
- [x] A malformed note of each kind warns, and fails `--block` under
      `--agent`.
- [x] `VOCABULARY.md` and the CLI help name the three kinds.
- [x] A sweep of the live vault exits 0, agent mode included.

## Outcome

The three kinds ship in `0.6.0`. Their shared fields live in one shape
in `src/vocabulary.ts`, and a waypoint adds `cover`. `vault-check`
picks the severity from `--agent`, so a warning stays a warning for the
operator and an agent write fails in block mode.

The live vault already met the contracts. The sweep reports the same 94
problems before and after, all the agent mode warning for a kind notes
note, and exits 0. No note needed a change.
