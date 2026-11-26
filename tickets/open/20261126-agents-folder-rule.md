---
title: Keep Agents/ flat and holding only agent notes
created: 2026-11-26
priority: normal
assignee:
pr:
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

- [ ] A note directly in `Agents/` with another kind, or with no kind,
      fails `--block`.
- [ ] A note in an `Agents/` subfolder warns, and the warning never
      fails `--block`.
- [ ] A note directly in `Agents/` with kind `agents` passes.
- [ ] An `Agents` folder below the vault root gets no problem.
- [ ] A sweep of the migrated vault exits 0.

## Outcome
