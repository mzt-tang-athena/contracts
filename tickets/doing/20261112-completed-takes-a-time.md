---
title: Completed takes a time
created: 2026-11-12
priority: normal
assignee: omp
pr:
depends: []
---

## Spec

monkey-tasks ticket `20261111-completed-takes-a-time` needs `completed`
to accept a time as well as a date. ADR 20261111 in monkey-tasks
decided that a new tick writes a local timestamp, and that a value
without a time stays valid forever.

Today `taskFrontmatter` and `deedFrontmatter` in
`packages/schemas/src/vocabulary.ts` hold:

```
completed: isoDate.nullish(),
```

A datetime such as `2026-11-11T18:08` fails validation, so the app
cannot store when in the day a task was done.

Change both `completed` fields to `dateOrDatetime.nullish()`. Do not
change any other field.

## Acceptance

- [ ] `completed: 2026-11-11` reads.
- [ ] `completed: 2026-11-11T18:08` reads.
- [ ] A free string such as `completed: yesterday` fails.
- [ ] The task and deed schemas agree.
- [ ] `npm test`, `npm run typecheck`, `npm run build`,
      `npm run check:package` and the docs checks pass.

## Outcome

(filled in before moving to done/)
