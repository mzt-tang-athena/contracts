# The schema normalizes list membership

- **Status:** accepted
- **Date:** 2026-11-14

## Context

A task note carries one `list` now, but old notes carry `lists`. The app
must read both and never branch on the legacy field. `validateNote`
accepted only `z.ZodObject`, so a schema with a transform could not pass
through it.

## Decision

`taskFrontmatter` keeps `lists` in the object for validation only. A
transform drops it and promotes its first link when `list` is absent. An
explicit `list` wins, including an explicit empty value. We widened
`validateNote` to `z.ZodType`.

We rejected keeping both fields in the output and exporting a helper.
Every consumer would have to remember the helper, and one missed call
would read stale membership.

## Consequences

The app sees one field, `data.list`. A malformed legacy `lists` still
fails and becomes a repair row.

A transformed schema is a pipe, so `validateNote` takes any `z.ZodType`.
The loose object still lets unknown Obsidian keys through.
