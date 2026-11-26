# Vault note vocabulary

The single contract for every client that reads or writes vault notes:
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
- An absent property means the documented default. Only `kind` is
  required on a deed note, and on a notes, references or waypoints
  note. A task or list note also needs `created`, and an agent note
  also needs `created` and `categories`.
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
| `alert weight` | `harsh` or `quiet` | harsh | how hard this task's alerts ring |
| `list` | wikilink | Main | the one list this task belongs to |
| `status` | `"[[backlog]]"`, `"[[active]]"`, `"[[done]]"`, `"[[dropped]]"`, `"[[someday]]"` | plain task | lifecycle stage; a task with a status is a deed |
| `blocked by` | wikilinks | unblocked | each linked note must finish before this one starts |

An old `lists` property reads its first link. It is validated, then
dropped; writers store `list`.

`alert weight` decides delivery only. A cue writes `quiet`; a need
writes nothing, because absent means `harsh`. An empty property means
the same as an absent one, and any other value also reads `harsh`, so
a typo never makes an alert silent. The schema reports a warning for
that other value, and not for an empty one. A warning is not an error:
the note stays valid, its row stays, and the app can name the value to
fix. An error still hides the row.

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

## Agent notes

One file per note in `Agents/`. An agent note holds what an agent
wrote for the operator to read or keep: a handover, research, or a
note about the life system. The folder is flat. Lists come from a
Base, not from subfolders. A note directly in `Agents/` whose kind is
not `agents` is an error. A note in an `Agents/` subfolder is a
warning.

| Property | Form | Default when absent | Meaning |
|---|---|---|---|
| `kind` | `"[[agents]]"` | required | the note type marker |
| `created` | date or datetime | required | when the agent wrote the note |
| `categories` | wikilinks | required | one or more categories the note belongs to |
| `types` | wikilinks | untyped | what sort of note this is, such as a handover |
| `tags` | strings | untagged | free tags |

A single category reads as a one-item list. An agent note has no
`status`.

`kind: "[[notes]]"` belongs to the operator's own thinking. Agents
never create a note of that kind. An agent writes `kind: "[[agents]]"`
instead.

Each `types` link must point to a note that already exists, so agents
cannot invent new types. The schema checks the link form only. The
vault checker checks that the note exists. See ADR
`20261126-vault-writing-standards`.

## Notes

One file per note in `Notes/`. A note holds the operator's own
thinking. Agents never create one, and an agent edit only warns. These
notes stay light: only `kind` is required, so `created` is optional.

| Property | Form | Default when absent | Meaning |
|---|---|---|---|
| `kind` | `"[[notes]]"` | required | the note type marker |
| `created` | date or datetime | none | when the note was written |
| `categories` | wikilinks | none | the waypoints the note belongs to |
| `types` | wikilinks | none | what sort of note this is |
| `related` | wikilinks | none | notes this one relates to |

A single link reads as a one-item list. Every other property, such as
`tags` or `updated`, is kept as written.

The checker reports a malformed note as a warning, and as an error
under `--agent`, so an agent write is caught and the operator is never
blocked.

## References

One file per reference in `References/`: a recipe, a book, or another
thing the operator looks up rather than thinks with. Only `kind` is
required.

| Property | Form | Default when absent | Meaning |
|---|---|---|---|
| `kind` | `"[[references]]"` | required | the note type marker |
| `created` | date or datetime | none | when the note was written |
| `categories` | wikilinks | none | the waypoints the reference belongs to |
| `types` | wikilinks | none | what sort of reference it is, such as a recipe |
| `related` | wikilinks | none | notes this one relates to |

A single link reads as a one-item list. A reference keeps its own
fields, such as `rating`, `serving size`, `ingredients` or `author`, as
written.

## Waypoints

One file per waypoint in `Waypoints/`: the areas of the operator's
life. A waypoint may sit under another one through `categories`, and a
note's `categories` points at a waypoint. Only `kind` is required.

| Property | Form | Default when absent | Meaning |
|---|---|---|---|
| `kind` | `"[[waypoints]]"` | required | the note type marker |
| `created` | date or datetime | none | when the note was written |
| `categories` | wikilinks | none | the waypoints this one sits under |
| `types` | wikilinks | none | what sort of note this is |
| `related` | wikilinks | none | notes this one relates to |
| `cover` | wikilink | none | the image shown for this waypoint |

A single link reads as a one-item list. A `cover` holds one link, in
the quoted form, for example `cover: "[[image.jpg]]"`.

References and waypoints follow the same checker rule as notes: a
malformed one is a warning, and an error under `--agent`. The three
kinds are in ADR `20261126-vault-writing-standards`, with an amendment
dated 2026-11-26.

## Journal notes

One file per day in `Journal/Daily/`. These daily notes are the
monkey-tasks journal. The contract names only the place and the file
name: `YYYY-MM-DD.md`, a real local date. `journalFileName` checks the
name.

No frontmatter is required. The body grammar belongs to monkey-tasks
ADR `20261112-journal-format`. The vault checker never blocks a write
to a journal note.
