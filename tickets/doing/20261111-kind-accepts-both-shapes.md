---
title: Kind accepts both shapes
created: 2026-11-11
priority: normal
assignee: omp
pr:
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

- [ ] A bare kind reads and returns the link form on every schema.
- [ ] The link form reads unchanged.
- [ ] A wrong kind still fails.
- [ ] `npm test`, `npm run typecheck`, `npm run build`,
      `npm run check:package` and the docs checks pass.

## Outcome

(filled in before moving to done/)
