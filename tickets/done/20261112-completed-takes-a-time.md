---
title: Completed takes a time
created: 2026-11-12
priority: normal
assignee: omp
pr: 16
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

- [x] `completed: 2026-11-11` reads.
- [x] `completed: 2026-11-11T18:08` reads.
- [x] A free string such as `completed: yesterday` fails.
- [x] The task and deed schemas agree.
- [x] `npm test`, `npm run typecheck`, `npm run build`,
      `npm run check:package` and the docs checks pass.

## Outcome

The task and deed schemas take `completed` as `dateOrDatetime`. A date
alone and a datetime both read unchanged. A free string fails. No other
field changed.

The new tests failed before the change on the datetime value: 2 failed,
87 passed. After it, `npm test` passes 89 schemas tests, plus the
browser-driver and vale-rules suites. `npm run typecheck`,
`npm run build`, `npm run check:package`, `scripts/check-records.sh`
and both CI jobs pass on PR 16.

monkey-tasks pins the submodule at `a848179` and proves the app writes
and reads both shapes.
