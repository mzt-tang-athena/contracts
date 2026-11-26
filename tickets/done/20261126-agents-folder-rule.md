---
title: Keep Agents/ flat and holding only agent notes
created: 2026-11-26
priority: normal
assignee: opencode
pr: 27
depends: [20261126-vault-check-cli]
---

## Spec

ADR `20261126-vault-writing-standards` makes `Agents/` a flat folder of
agent notes, and puts lists in an Obsidian Base instead of subfolders.
The `vault-check` command checks each note's kind, and says nothing
about where the note sits. This ticket adds the folder rule, so an
agent that files a note in the wrong place, or with the wrong kind, is
caught at the write.

- A note directly in `Agents/` whose kind is not `agents` is an error.
  A note with no kind is the same error.
- A note in any subfolder of `Agents/` is a warning, "Agents/ is flat".
  Its kind is still checked, so the warning never hides an error.
- An `Agents` folder deeper in the vault, such as `Archive/Agents/`, is
  not this folder and gets no problem.
- `--agent` keeps its kind-notes rule alongside the folder rule.
- The CLI help, the README and `VOCABULARY.md` name the rule.

## Acceptance

- [x] A note directly in `Agents/` with another kind, or with no kind,
      fails `--block`.
- [x] A note in an `Agents/` subfolder warns, and the warning never
      fails `--block`.
- [x] A note directly in `Agents/` with kind `agents` passes.
- [x] An `Agents` folder below the vault root gets no problem.
- [x] A sweep of the migrated vault exits 0.

## Outcome

The rule ships in `0.5.0`. The folder check keys on the top-level
`Agents` folder only, so `Archive/Agents/` is left alone.

The vault migration that this rule checks followed: 20 notes carry
`kind: "[[agents]]"` with `created` and `categories`, the 5
`home-server/` notes moved up with their `diagrams/` folder, and 14
stale notes moved to `Archive/Agents/old system agent generated
notes/`. A sweep of the vault exits 0 and finds nothing.

Gate full pass, `npm test` 155 pass, typecheck, build and `publint`
clean.
