---
title: The vault folder map lives in the contract
created: 2026-11-27
priority: normal
assignee: opencode
pr:
depends: []
---

## Spec

The vault's root `AGENTS.md` holds the only folder map, and it goes
away. It clashes with the `agents.md` hub note on the Windows laptop's
case-insensitive disk, so the two files cannot coexist there. Its
knowledge moves to the single contract, `packages/schemas/VOCABULARY.md`.

Add a "Vault folders" section to `VOCABULARY.md`:

- The folder table: `Tasks/`, `Deeds/`, `Notes/`, `References/`,
  `Waypoints/`, `Journal/`, `Agents/`, `Inbox/`, `Archive/`,
  `Templates/`, `Attachments/`, `TaskForge/`.
- The rules from the retired file: leave `Archive/` alone, search by
  name before creating a note, and link by name, not by path.
- Leave out what this document and the hooks already say, such as the
  journal grammar and the agent-note kinds.

Record the retirement as a dated amendment at the bottom of ADR
`20261126-vault-writing-standards`: PARA retired 2026-11-27, the 58
copies that a stale sync replica pushed back on 2026-11-06 removed from
the tree (git keeps them), and the vault's rule files folded into this
contract plus the global agent rules.

Docs only, so no package version changes.

## Acceptance

- [ ] `VOCABULARY.md` carries the folder table and the three vault rules.
- [ ] Nothing from the retired root `AGENTS.md` is repeated from this document or the hooks.
- [ ] The ADR amendment names the date, the 58 removed copies and where the rules went.
- [ ] `scripts/gate.sh full` passes.

## Outcome
(filled in before moving to done/)
