---
title: Kind accepts both shapes
created: 2026-11-11
priority: normal
assignee: omp
pr: 14
depends: []
---

## Spec

monkey-tasks ticket `20261111-kind-accepts-both-shapes` needs the
schema to read a hand-written `kind: tasks`, while the app keeps
writing `kind: "[[tasks]]"`. The same holds for lists and deeds.

`taskFrontmatter`, `deedFrontmatter` and `listFrontmatter` each hold a
strict literal for their kind. A bare value fails validation, so a note
from another tool cannot be read.

Accept both shapes on the read side and return the link form. One
helper serves all three schemas, so the rule cannot drift.

## Acceptance

- [x] A bare kind reads and returns the link form on every schema.
- [x] The link form reads unchanged.
- [x] A wrong kind still fails.
- [x] `npm test`, `npm run typecheck`, `npm run build`,
      `npm run check:package` and the docs checks pass.

## Outcome

The read side accepts the bare value and the link form for tasks, deeds
and lists. One `kindLink` helper wraps the bare value and checks it
against the schema's literal, so the parsed value is always the link
form.

Four new tests failed before the change with `expected "[[tasks]]"`.
After it, `npm test` passes 85 schemas tests and 4 vale-rules tests.
`npm run typecheck`, `npm run build`, `npm run check:package`,
`scripts/check-records.sh` and `make lint` pass. Both CI jobs pass on
PR 14.

monkey-tasks pins the submodule at the merged commit and proves the app
reads a bare kind note end to end.
