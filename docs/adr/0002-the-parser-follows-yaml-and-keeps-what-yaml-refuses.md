# 0002. The parser follows YAML and keeps what YAML refuses

- **Status:** accepted
- **Date:** 2026-10-27

## Context

`parseFrontmatter` in `packages/schemas` is a small parser we wrote.
It disagreed with YAML in two places. It read a list item only at two
spaces, and it kept the backslashes of a double-quoted value. The
monkey-tasks app then lost a task's lists on save and showed titles
with extra backslashes (monkey-tasks ticket 0053).

The fix raised two questions. Should a YAML library replace the
parser? And what should the parser do with a note that YAML refuses?
Three cases come up in real notes: a list item after a tab, an escape
YAML does not know, such as `\U` in `"C:\Users"`, and a value with a
quote at one end only.

## Decision

The parser reads every flat note the way YAML reads it. Where YAML
refuses a note, the parser keeps the text as written and does not
fail. A tab before a list item still makes an item. An unknown escape
keeps its backslash. A one-sided quote stays part of the value.

The `vault:check` script in monkey-tasks reports each note that YAML
refuses (monkey-tasks ADR 0029, amendment of 2026-10-26). The app
shows the task, and the check tells the user which line to fix for
other YAML readers, such as Obsidian.

We rejected two alternatives:

- **A YAML library, such as js-yaml.** It gives each bare value a
  type: `20` reads as a number and `true` as a boolean. The schemas
  expect the text of each value, so every consumer would change. It
  also adds a dependency to a package that now has only Zod.
- **Fail a note that YAML refuses.** The app would move the task to
  "needs repair" over a tab or a stray backslash. The user loses the
  task from every list until they edit the file by hand.

## Consequences

Every value the old parser misread now reads as YAML reads it. The
tests in `packages/schemas/test/frontmatter.test.ts` pin each case.

A note with a tab or an unknown escape reads in the app but not in
Obsidian. Only the check reports it. The app gives no warning.

Frontmatter stays flat. Nested keys, flow lists and values over more
than one line stay out of scope. A need for nested values reopens the
library question.
