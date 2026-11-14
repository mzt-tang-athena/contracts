---
title: One list field on the task note
created: 2026-11-14
priority: high
assignee: omp
pr: 18
depends: []
---

## Spec

The task note carries `list`, one wikilink. It replaces `lists`, a list
of wikilinks. The app decision is ADR `20261111-one-list-and-tab-order`
in monkey-tasks.

- Add `list: wikilink.nullish()` to `taskFrontmatter`.
- Keep `lists: optionalList(wikilink)` in the object for validation
  only. A malformed legacy value must still fail and become a repair
  row, as today.
- Wrap the object in a transform. It drops `lists` from the output and
  sets `list` to the first legacy link when `list` is absent. An
  explicit `list` wins.
- Widen `validateNote` in `src/note.ts` from `z.ZodObject` to
  `z.ZodType`. A transformed schema is a `ZodPipe`, not an object.
  `ValidatedNote` already reads `z.output<S>`, so callers do not move.
- Update `VOCABULARY.md`. The task row becomes `list`, one wikilink,
  default Main. The list-note paragraph says a task belongs through its
  `list` property, and an old `lists` reads its first link.
- Do not change the YAML parser tests in `test/frontmatter.test.ts`.
  They use `lists` as a generic block-list key, not as the task field.

Tests:

- `list: "[[Focus]]"` parses to `[[Focus]]`, and the output has no
  `lists` key.
- A two-item `lists` parses to its first link, and the output has no
  `lists` key.
- An explicit `list` plus a legacy `lists` keeps the explicit one.
- Neither key leaves `list` absent.
- `list:` with an empty value is valid and null.
- `list: ""` fails.
- A block under `list` fails.

This is the contract half. The app half is monkey-tasks ticket
`20261111-one-list-field`.

## Acceptance

- [x] `taskFrontmatter` output carries `list` and no `lists`.
- [x] A legacy two-link `lists` resolves to its first link.
- [x] An explicit `list` wins over `lists`.
- [x] A malformed legacy `lists` still fails validation.
- [x] `npm test`, `npm run typecheck`, `npm run build` and
      `npm run check:package` pass.
- [x] `VOCABULARY.md` describes `list` and the legacy read.

## Outcome

Shipped on 2026-11-14.

- `taskFrontmatter` validates `list` and keeps `lists` for validation
  only. A transform drops `lists` and promotes its first link when
  `list` is absent. An explicit `list`, including an empty one, wins.
- `validateNote` widens to `z.ZodType`. ADR
  `20261114-the-schema-normalizes-membership` records why.
- Tests cover one list, a legacy two-link list, explicit wins, neither,
  an explicit empty list, an empty string, a block under `list`, a
  malformed legacy value, and the note text path.
- The built package returns the expected shape for all five live cases.
- `npm test` passes 99 schema tests. Typecheck, build and
  `check:package` pass.

The app half is monkey-tasks ticket `20261111-one-list-field`.
