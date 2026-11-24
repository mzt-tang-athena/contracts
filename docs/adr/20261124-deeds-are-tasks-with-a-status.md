# Deeds are tasks with a status

- **Status:** accepted
- **Date:** 2026-11-24

## Context

A deed is a bigger thing the operator wants to do: a project, an idea
or a goal. The vault holds 72 deed notes in `Deeds/`. The app reads
task notes and never reads deeds.

The operator has many ideas and projects they truly want to do. They
have no one place for them, so they drift into "someday". Deeds should
give four things:

- progress toward big goals;
- a record of what got done;
- a short board of what is now and what is next;
- an order to work in.

Progress means done items over time and time spent. It does not mean
checklists or a count of child deeds. Deeds fell out of use because
the app does not show them. Updating them by hand takes too much
effort.

A code project, such as the game, is one deed. It links to its repo.
Its steps are that repo's tickets.

The spike in [monkey-tasks#211] measured the deeds on 2026-11-24:

- Status: 48 backlog, 9 someday, 4 active, 11 empty.
- No deed has ever reached done or dropped.
- 22 child deeds sit under 6 parents, one level deep.
- 7 deeds carry an `after` link. Most mean "do this next".
- 34 deed bodies hold 157 checkboxes, 138 of them open.
- No deed uses `due`, `reminders`, `recurrence` or `completed`.

The spike offered three models. A folds deeds into tasks. B links a
task to its deed. C only shows deeds. The spike recommended B. The
operator read it and picked a smaller form of A.

Two earlier records bear on this one. The monkey-tasks ADR
`20261111-task-note-schema` kept the task field set unchanged. It
added no `parent`, and left deeds to the spike. ADR
`20261114-the-schema-normalizes-membership` set the pattern for an old
field: the reader validates it and hands the app one shape.

[monkey-tasks#211]: https://github.com/mzt-tang-athena/monkey-tasks/pull/211

## Decision

A deed is a task with a status. The vault has one note kind for work,
the task. We keep the name "deed" for a task that has a status.

- **Status.** A task gains an optional `status`: backlog, active,
  done, dropped or someday. A task with a status is a deed. The app
  shows deeds on a board, not on Main.
- **Done.** Done is always a `completed` date, for every task. The
  app writes status done and `completed` together. The vault checker
  flags a note where the two disagree.
- **Blocked by.** Any task can carry `blocked by`, a list of links.
  Each link is a hard "can't start until". The links form a graph,
  not a chain.
- **Order.** The drag `order` holds "do this next". The old
  `after` stays legacy. The reader does not treat it as `blocked by`,
  because most `after` links are order.
- **No parent.** Tasks get no `parent` field. Existing `parent deed`
  values stay in the files, because the reader keeps unknown
  properties.
- **No bulk rewrite.** The reader reads `kind: "[[deeds]]"` as a task
  with a status. A note takes the new shape when the app next edits
  it. This keeps ticket 0094's rule: never rewrite the vault in bulk.
- **Main.** Main shows only tasks without a status. The 72 deeds do
  not flood it.
- **Checkboxes.** The 138 checkboxes stay in deed bodies. One becomes
  a task note when it needs a date or an alarm.
- **No cap.** Any number of deeds can be active.

### Options we rejected

- **Full A.** Tasks also gain `parent` and `categories`. All 72
  deeds move to `Tasks/` in one rewrite. The rewrite breaks the
  0094 rule. `parent` reverses the task note schema a second time,
  to model 22 child deeds one level deep.
- **B, link only.** Deeds stay their own kind, and a task links to
  its deed. It keeps two kinds with two done rules. A deed then has no
  date of its own. Its record of what got done lives in its steps. Adding A later would rewrite every deed. B was the spike's
  pick. We prefer to keep it as an add-on, below.
- **C, show only.** The app shows deeds and links nothing. It does
  not tie deeds to work, so it fails the goal.

### The trade-off

Tasks gain `status`. The task note schema ADR kept the task field set
unchanged, so this goes against it once. Every task now carries a
field most tasks never use. Two fields now speak about done: `status`
and `completed`. We accept that. The app writes both together. The
checker catches a hand edit that splits them. We add no `parent`, so
we go against the schema ADR once and only once.

### Why this order

The operator's main reason is that this pick is easy to reverse.

If membership matters later, an optional `deed:` link on a task adds
model B on top. A step points at its deed, and nothing gets rewritten.
A task with a status stays a deed.

The other order costs more. B first gives two kinds. Folding them into
one later rewrites every deed and every link to it. A first keeps B an
add-on. B first makes A a rewrite.

## Consequences

The app reads one kind, edits one kind and applies one done rule.
Deeds share the task's due date, reminders and recurrence, with no
second copy of those rules. A deed's `completed` date records what
got done.

The reader must accept today's deed shape. That includes a
bare status, a missing `created` date and `after`. Fixtures cover each
shape.

Deed notes stay in `Deeds/`. The app reads that folder too.

The 11 deeds with no status are reference notes. They stay
off Main and off the board. A small vault tidy moves them to `Notes/`.
The same tidy splits the 7 `after` links, with the operator, into
`blocked by` and order.

Child deeds lose their tree in the app. `parent deed` stays in the
file and in Obsidian, but the app does not read it.

Progress over time comes later. Done over time reads `completed`
dates. Time spent needs time entries, which no note carries yet.

The 138 checkboxes stay invisible to the app until one becomes a task.

The contract change is ticket `20261124-task-status-and-blocked-by`.
Child tickets in monkey-tasks hold the app work.
