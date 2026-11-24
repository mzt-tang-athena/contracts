---
title: A task carries status and blocked by
created: 2026-11-24
priority: normal
assignee: opencode
pr:
depends: []
---

## Spec

ADR `20261124-deeds-are-tasks-with-a-status` decides that a deed is a
task with a status. Write that ADR first. It lands in the PR that
files this ticket, so it exists before this work starts.

This ticket is the contract half. The app half is monkey-tasks ticket
`20261124-app-reads-deeds-as-tasks`. It waits for a schemas release
with this change.

In `packages/schemas/src/vocabulary.ts`:

- `taskFrontmatter.kind` accepts `tasks` and `deeds`, bare or as a
  link. The output is always `"[[tasks]]"`, so the app sees one kind.
- Add an optional `status` to the task: backlog, active, done,
  dropped or someday. Keep today's deed rule: a bare value reads as
  its link form. Rename `deedStatus` and `DeedStatus` to
  `taskStatus` and `TaskStatus`.
- Add an optional `blocked by` to the task: a list of wikilinks. A
  single value reads as a one-item list, as it does for deeds today.
- Read `after` as legacy. Validate it, so a broken value still fails.
  Keep it out of `blocked by`, because most `after` links mean order.
  Leave it in the output as is. A vault tidy splits it later.
- A note read as `deeds` may lack `created`. 15 deeds do. A note read
  as `tasks` still needs it.
- `parent deed`, `categories` and `types` are not task fields. The
  loose object keeps them in the output untouched.
- `taskIsDone` stays: done means `completed` is present.
- `taskWarnings` names a mismatch. Status done without `completed`
  is one. `completed` with any other status is the other. The note
  stays valid.
- Delete `deedFrontmatter`, `DeedFrontmatter` and `deedIsDone`. The
  only outside caller is monkey-tasks' vault check, and its ticket
  moves it to `taskFrontmatter`. It pins a released version, so
  nothing breaks before it moves.
- Bump `@mzt-tang-athena/schemas` to `0.3.0`, since exports go away.

Update `VOCABULARY.md`. The task table gains `status` and
`blocked by`. The deed section shrinks to a short note. A deed is a
task with a status, and `kind: "[[deeds]]"` still reads. The reader
keeps `after`, `parent deed`, `categories` and `types` unread.

Fixtures in `test/vocabulary.test.ts`, one per shape:

- a task with no status;
- a task with each of the five statuses;
- a bare status, such as `backlog`;
- a deed note as stored today, with `parent deed` and `categories`;
- a deed note with no status;
- a deed note with no `created`;
- a bare `kind: deeds`;
- `after` alone, which leaves `blocked by` empty;
- `blocked by` with one link and with two;
- status done with `completed`, which warns nothing;
- status done without `completed`, which warns;
- `completed` with status active, which warns;
- a broken `after` or `blocked by`, which fails;
- `kind: lists` and an unknown status, which fail.

Move `test/vault-sweep.test.ts` to `taskFrontmatter`. Every real note
in `Deeds/` must still validate.

## Acceptance

- [ ] `taskFrontmatter` reads every deed shape in the fixtures.
- [ ] A deed note parses with kind `"[[tasks]]"` and its status.
- [ ] `after` never shows up in `blocked by`.
- [ ] A done and `completed` mismatch warns, and the note stays valid.
- [ ] The live vault sweep passes against `taskFrontmatter`.
- [ ] The package no longer exports `deedFrontmatter` or `deedIsDone`.
- [ ] `VOCABULARY.md` matches the schema.
- [ ] The package version is `0.3.0`.

## Outcome

(filled in before moving to done/)
