---
title: Read alert weight on the task note
created: 2026-11-16
priority: high
assignee: opencode
pr:
depends: []
---

## Spec

The task note carries `alert weight`, one plain value: `harsh` or `quiet`.
The decision is monkey-tasks ADR `20261111-reminder-weight.md`, including
its 2026-11-16 amendment. The app half is monkey-tasks ticket
`20261111-alert-weight-schema`.

- Add `alertWeights` and `AlertWeight` to `src/vocabulary.ts`.
- Add `"alert weight"` to `taskFrontmatter`. Input is optional. Output is
  always an `AlertWeight`. Absent, null and `harsh` read `harsh`; `quiet`
  reads `quiet`. Any other value reads `harsh`, and the note stays valid
  with its data, so the row stays and the alert is not silent.
- Add `taskWarnings(values: Record<string, unknown>)`. It returns one
  plain message per value the schema reads through a fallback. Today only
  `alert weight` warns: an unreadable value says it rings harsh.
- Export both from the package index.
- Deeds keep no weight. Only tasks ring.
- Do not change `validateNote`.
- Update `VOCABULARY.md`.

The spaced key matches `recurrence previous`. The YAML parser keeps a
key with a space, so the note text path reads the same key as an object.

Tests:

- Absent, `harsh`, `quiet`, an unknown value (`loud`), the wrong case
  (`Quiet`), a number, and null.
- The output is always `harsh` or `quiet`, and the input type stays
  optional.
- A `validateNote` round trip on note text with `alert weight: quiet`
  reads `quiet`.
- `taskWarnings` returns one message for each bad value and none for the
  good ones.

## Acceptance

- [ ] `taskFrontmatter` always outputs an `alert weight` of `harsh` or
      `quiet`.
- [ ] Absent, null and an unreadable value read `harsh`, and the note
      stays valid.
- [ ] `taskWarnings` names each unreadable value and its harsh fallback.
- [ ] `alert weight: quiet` survives the note text round trip.
- [ ] `npm test`, `npm run typecheck`, `npm run build`,
      `npm run check:package` and `make lint` pass.
- [ ] `VOCABULARY.md` describes the field and its warning.

## Outcome

(filled in before moving to done/)
