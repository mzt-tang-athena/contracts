---
title: A vault-check command that enforces the note contracts
created: 2026-11-26
priority: normal
assignee: opencode
pr: 26
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

- [x] A valid task, deed, list and agent note each pass.
- [x] A broken note of each kind prints its problem.
- [x] A note with an unknown kind passes.
- [x] A misnamed journal file fails. A journal body is never read.
- [x] An agent note with a `types` link to a missing note fails.
- [x] `--warn` exits 0 with problems. `--block` exits non-zero.
- [x] One note checks in under 200 ms on the live vault. Report the
      measured time and what limits it.
- [x] A run on the live vault root finishes and lists today's
      problems.

## Outcome

`vault-check` ships in `0.4.0` as a package bin, built to
`dist/vault-check-bin.js`. The gate passes and `npm test` passes 147
tests. A read-only run on the live vault finds one problem: the
Templater task template's placeholder `created` value.

- Input is a note or a vault root. `--stdin --path <path>` checks text
  an agent has not written yet, and `--vault` sets the root.
- The checker picks the schema from `kind`, as the ticket says, so it
  passes an unknown kind or no kind. The live sweep showed the effect.
  The 15 top-level `Agents/` notes carry `kind: "[[notes]]"` (8), no
  kind (6) or tags only (1), so none is an agent note yet and all 15
  pass. The migration turns them into `agents` notes, and the checker
  fails each one until its frontmatter is right.
- A journal note is checked for its file name only, and the problem is
  a warning, so no mode blocks a journal write. That is deliberate, per
  the run instruction, and it differs from the acceptance line.
- `--agent` adds the operator's rule for `kind: "[[notes]]"`. Creating
  one is an error and editing one is a warning.
- `types` links resolve against the vault's file names, which the
  checker reads only when an agent note has a type.
- Speed: a task note checks in 0.1 ms and an agent note with the vault
  walk in 2.3 ms, in process. A CLI process adds Node start, 190 to
  350 ms at load average 11. Node start is the limit, not the check.
- How athena runs it today: from a checkout, or from the registry after
  a hand publish. The README has both commands. Nothing was published.

Found while building this: the date schemas accept a day that is not on
the calendar while `journalFileName` rejects it. Ticket
`20261126-real-calendar-dates` records it.

