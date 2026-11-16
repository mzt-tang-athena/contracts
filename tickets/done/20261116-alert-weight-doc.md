---
title: Describe the alert weight fallback exactly
created: 2026-11-16
priority: normal
assignee: opencode
pr: 20
depends: []
---

## Spec

The `alert weight` field shipped in 20261116-alert-weight-field. Its
`taskWarnings` contract warns for a value it cannot read, and not for
an empty value.

Two descriptions say an empty value raises a warning. That is false: an
empty property arrives as null, and `taskWarnings` skips null.

- The `"alert weight"` field comment in `src/vocabulary.ts`.
- The `alert weight` paragraph in `VOCABULARY.md`.

Say what the code does: an absent or empty property reads `harsh` with
no warning, and any other unreadable value reads `harsh` and warns.

No code changes.

## Acceptance

- [x] The field comment matches `taskWarnings` for absent, empty and
      unreadable values.
- [x] `VOCABULARY.md` says which values warn and which do not.
- [x] `npm test`, `npm run typecheck`, `npm run build`,
      `npm run check:package` and `make lint` pass.

## Outcome

Shipped on 2026-11-16.

- The field comment says an absent or empty value reads `harsh` with no
  warning, and an unreadable value reads `harsh` and warns.
- `VOCABULARY.md` says an empty property means the same as an absent
  one, and the schema warns only for another value.
- No code or test changed. `npm test` passes 107 schema tests.
  Typecheck, build, `check:package` and `make lint` pass.
