---
title: Describe the alert weight fallback exactly
created: 2026-11-16
priority: normal
assignee: opencode
pr:
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

- [ ] The field comment matches `taskWarnings` for absent, empty and
      unreadable values.
- [ ] `VOCABULARY.md` says which values warn and which do not.
- [ ] `npm test`, `npm run typecheck`, `npm run build`,
      `npm run check:package` and `make lint` pass.

## Outcome

(filled in before moving to done/)
