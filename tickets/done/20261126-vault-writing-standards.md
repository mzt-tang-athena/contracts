---
title: Contracts for agent notes and the journal
created: 2026-11-26
priority: normal
assignee: opencode
pr: 25
depends: []
---

## Spec

The vault has two note systems and three rule files that disagree.
Agents cannot tell which format is right. Record the operator's
decisions from 2026-11-21 to 2026-11-26 in ADR
`20261126-vault-writing-standards`, and add the phase 2 contracts.

In `packages/schemas/src/vocabulary.ts`:

- Add `agentFrontmatter`. `kind` reads `agents`, bare or as a link,
  and parses to `"[[agents]]"`. `created` is a date or datetime.
  `categories` holds one or more wikilinks. `types` and `tags` are
  optional lists. Unknown properties are kept.
- Add `journalFileName`. It accepts `YYYY-MM-DD.md` with a real
  calendar date, and nothing else.

Export both from `index.ts`. Add sections for agent notes and journal
notes to `VOCABULARY.md`. Bump `@mzt-tang-athena/schemas` to `0.3.1`,
since the change only adds exports.

## Acceptance

- [x] `agentFrontmatter` reads an agent note in link and bare form.
- [x] It rejects a missing `created`, missing or empty `categories`,
      and any other kind, `notes` included.
- [x] `journalFileName` rejects dates not on the calendar, such as
      `2025-02-29.md`.
- [x] Every real file in `Journal/Daily/`, except `AGENTS.md`, passes
      `journalFileName` in the live vault sweep.
- [x] `VOCABULARY.md` matches the schemas.
- [x] The package version is `0.3.1`.

## Outcome

`agentFrontmatter` and `journalFileName` ship in `0.3.1`. The ADR
records the decisions and the enforcement design. The live vault
sweep passes on 108 daily notes.

Next: ticket `20261126-vault-check-cli`. Publishing needs a `v0.3.1`
tag on the merge commit.
