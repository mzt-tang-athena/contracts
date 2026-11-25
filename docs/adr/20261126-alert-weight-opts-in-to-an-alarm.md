# A harsh alert weight opts in to an alarm

- **Status:** accepted
- **Date:** 2026-11-26

## Context

The `alert weight` property has two values, `harsh` and `quiet`. Absent
meant `harsh`. The editor only ever wrote `quiet`, so every reminder
rang as a loud alarm unless the operator chose a cue.

The operator tried that on a phone. The alarm felt wrong for most
reminders, and the harsh one made no real sound. They asked for a
simple default: one normal notification. A real alarm should be a
choice a task makes.

The app side is monkey-tasks ADR `20261111-reminder-weight`, with its
2026-11-26 amendment.

## Decision

We keep the property and flip its default.

- Absent, empty and `quiet` mean a normal reminder.
- `harsh` means an alarm.
- Any other value reads `quiet`, and `taskWarnings` names it.

An old note needs no edit. The editor wrote `quiet` or nothing, and both
now mean a normal reminder. A note that someone wrote `harsh` by hand
keeps its alarm.

A typo still never silences a task. Before, a typo fell to the loud
side. Now it falls to a normal reminder, which still rings once.

## Alternatives

- **A new property, such as `alarm: true`.** The name says what it does,
  and `alert weight` would not change meaning. We rejected it. The
  schema would hold two ways to say one thing. The old property would
  stay in notes with no job. The app would read both.

## Consequences

- One property still says how a task rings. Nothing in the vault moves.
- The word `harsh` now means an alarm, not a default. Its name is a
  little odd for a plain on switch. We accept that over a second
  property.
- A mistyped `harsh` gives a normal reminder, not an alarm. The warning
  shows it in Needs repair.
- An older build reads a note with no property as `harsh`. The operator
  runs one app, so we expect no mixed reading.
