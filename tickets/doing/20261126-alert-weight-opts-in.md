---
title: A harsh alert weight opts in to an alarm
created: 2026-11-26
priority: high
assignee: opencode
pr:
depends: []
---

## Spec

The monkey-tasks reminder redesign (ticket `20261126-reminders-kiss`)
makes a normal notification the default. A task opts in to a real alarm.
The schema flips the default of `alert weight`.

- Absent, null, empty, `quiet` and any unreadable value read `quiet`.
- `harsh` reads `harsh`.
- `taskWarnings` still names an unreadable value, and now says it reads
  as a normal reminder.
- Update `VOCABULARY.md`.
- Record the decision in an ADR.

## Acceptance

- [ ] `taskFrontmatter` outputs `quiet` for an absent or unreadable
      `alert weight`, and `harsh` only for `harsh`.
- [ ] `taskWarnings` names an unreadable value and its fallback.
- [ ] `make lint` and the schema tests pass.

## Outcome

(filled in before moving to done/)
