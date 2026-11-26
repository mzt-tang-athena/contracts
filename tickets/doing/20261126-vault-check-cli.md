---
title: A vault-check command that enforces the note contracts
created: 2026-11-26
priority: normal
assignee: opencode
pr:
depends: [20261126-vault-writing-standards]
---

## Spec

ADR `20261126-vault-writing-standards` makes one checker the single
rule engine for the vault. Agent hooks, the vault sync and an Obsidian
Violations Base all call it. This ticket builds the checker. The hooks,
the sync step and the Base are later tickets.

Add a `vault-check` command to `packages/schemas`, as a package `bin`.

- **Input.** One note path, or a vault root. With a root it walks
  every markdown file.
- **Kinds.** It reads `kind` and picks the schema: `tasks` and `deeds`
  use `taskFrontmatter`, `lists` uses `listFrontmatter`, and `agents`
  uses `agentFrontmatter`. It passes any other kind, and a note with no
  `kind`, without a problem.
- **Journal.** A markdown file in `Journal/Daily/` must have a name
  that passes `journalFileName`. The checker never reads the body, and
  never blocks a journal write. `AGENTS.md` files are folder
  instructions, not notes, so it skips them everywhere.
- **Types.** Each `types` link on an agent note must resolve to an
  existing note in the vault, by file name, the way Obsidian resolves
  a link.
- **Warnings.** It prints the warnings from `taskWarnings` as warnings,
  not errors.
- **Modes.** `--warn` prints each problem and exits 0. `--block` prints
  each problem and exits non-zero when any error exists. Warnings never
  fail `--block`.
- **Output.** One line per problem: path, property, message. A
  `--json` flag prints the same as JSON for the Violations Base.
- **Speed.** A check of one note must be fast enough to run before
  every agent write. Resolve `types` from a list of file names, and do
  not parse the whole vault for one note.

## Acceptance

- [ ] A valid task, deed, list and agent note each pass.
- [ ] A broken note of each kind prints its problem.
- [ ] A note with an unknown kind passes.
- [ ] A misnamed journal file fails. A journal body is never read.
- [ ] An agent note with a `types` link to a missing note fails.
- [ ] `--warn` exits 0 with problems. `--block` exits non-zero.
- [ ] One note checks in under 200 ms on the live vault. Report the
      measured time and what limits it.
- [ ] A run on the live vault root finishes and lists today's
      problems.

## Outcome
(filled in before moving to done/)
