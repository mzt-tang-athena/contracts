---
title: Dates reject days that are not on the calendar
created: 2026-11-26
priority: low
assignee:
pr:
depends: []
---

## Spec

`dateOrDatetime`, `isoDate` and `isoDatetime` check the shape of a date,
not the calendar. `created: 2026-02-30` parses. `journalFileName` does
check the calendar and rejects `2026-02-30.md`, so a note and its own
journal file disagree.

Make every date value check its calendar day, the way `journalFileName`
does. Keep the accepted forms and the error messages. Move the check
into one helper and use it everywhere.

Found while building `vault-check`, ticket `20261126-vault-check-cli`.
Consumers get a strict check, so this is a minor version.

## Acceptance

- [ ] `2026-02-30`, `2026-13-01` and `2025-02-29` fail every date schema.
- [ ] `2024-02-29`, `2026-11-26` and `2026-11-26T15:00` pass.
- [ ] `journalFileName` behaves as before.

## Outcome
(filled in before moving to done/)
