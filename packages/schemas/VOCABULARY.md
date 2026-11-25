# Vault note vocabulary

The single contract for every client that reads or writes task notes:
the mobile app, Obsidian, vault agents, and a future MCP server on
athena. The Zod models in `src/vocabulary.ts` are the executable form
of this file. This document explains what each property means.

Rules that hold for all note types:

- The file name, without extension, is the note's title.
- Wikilink-valued properties are stored in their quoted form, for
  example `status: "[[active]]"`.
- A `kind` property reads as the bare value (`tasks`) or the link form
  (`"[[tasks]]"`). It always parses to the link form, and writers store
  the link form.
- Dates are `YYYY-MM-DD`. Datetimes are `YYYY-MM-DDTHH:MM`, seconds
  optional. No time zones; the phone's local time is the meaning.
- An absent property means the documented default. Nothing is required
  beyond `kind` on a deed note, and `kind` and `created` on a task or
  list note.
- Properties the schemas do not know are preserved, never rejected, so
  notes keep whatever Obsidian plugins add.
- Anything the app or a query needs lives in the note. Filesystem
  metadata is a cache, never a source of truth.

## Task notes

One file per task in `Tasks/`. The filename is what the task is. The
body is optional free text, usually empty.

| Property | Form | Default when absent | Meaning |
|---|---|---|---|
| `kind` | `"[[tasks]]"` or `"[[deeds]]"` | required | the note type marker; both read as `"[[tasks]]"` |
| `created` | date | required | the day the task was created |
| `completed` | date | open | present means done; the date is when |
| `due` | date or datetime | unscheduled | the day the task matters |
| `reminders` | datetimes | silent | when the phone buzzes; several allowed |
| `recurrence` | RRULE string | one-off | iCalendar recurrence for `due` |
| `alert weight` | `harsh` or `quiet` | quiet | `harsh` opts in to an alarm; `quiet` is a normal reminder |
| `list` | wikilink | Main | the one list this task belongs to |
| `status` | `"[[backlog]]"`, `"[[active]]"`, `"[[done]]"`, `"[[dropped]]"`, `"[[someday]]"` | plain task | lifecycle stage; a task with a status is a deed |
| `blocked by` | wikilinks | unblocked | each linked note must finish before this one starts |

An old `lists` property reads its first link. It is validated, then
dropped; writers store `list`.

`alert weight` decides delivery only. A normal reminder writes nothing,
because absent means `quiet`. A task that needs a real alarm writes
`harsh`. An empty property means the same as an absent one, and any
other value also reads `quiet`, so a typo never makes an alert silent.
The schema reports a warning for that other value, and not for an empty
one. A warning is not an error: the note stays valid, its row stays,
and the app can name the value to fix. An error still hides the row.

A status holds its quoted wikilink form. Bare values (`backlog`) exist
in older notes and are wrapped on read.

An old `after` property holds order links. The reader checks it and
keeps it in the output. It never reads it as `blocked by`. Most `after`
links mean order. A vault tidy splits it later.

Derived state: done means `completed` is present, for every task. A
note whose `status` and `completed` disagree still reads. The schema
warns about it. The app writes the two together.

Deferred until a consumer exists: `cancelled`, `updatedAt`, manual
ordering inside a list, subtasks. See ticket 0004.

## Deed notes

A deed is a task with a status. The app reads a deed note with the task
schema, so the vault has one note kind for work. Deeds live in `Deeds/`.

- A `kind` of `"[[deeds]]"` or a bare `deeds` parses to `"[[tasks]]"`.
  The app writes the task kind on its next edit of a deed note.
- A deed note may leave out `created`. A task note may not.
- `parent deed`, `categories` and `types` are not task fields. The
  reader does not read them, and keeps them untouched.

A deed with no status stays off the board and off Main. Free-form
properties on individual deeds (`repo`, `pursuit`, `estimate`, `tags`)
are kept as they are. See ADR `20261124-deeds-are-tasks-with-a-status`.

## List notes

One file per list in `Tasks/Lists/`. A list is a curated bucket of
tasks; a task belongs to a list through its `list` property. A note
with the old `lists` property reads its first link.

| Property | Form | Default when absent | Meaning |
|---|---|---|---|
| `kind` | `"[[lists]]"` | required | the note type marker |
| `created` | date | required | the day the list was created |

A list needs no other metadata yet. List notes earn properties of their
own (pinned order, icon, a waypoint) only when a feature asks for them.
