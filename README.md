# contracts

Central schemas for the monkey projects and athena services. One
package per domain under `packages/`. Projects contribute their
schemas here and consume shared ones. Consumers clone this repo as a
git submodule and depend on the package by file path (ADR 0007 in
monkey-tasks).

## Plan

1. `packages/schemas` - the notes vocabulary: task, deed, and list
   notes for monkey-tasks (moved from monkey-tasks, tagged v0.1.0).
2. Next: a budget package when monkey budget starts.
3. Later: a registry install path (GitHub Packages) when more machines
   consume packages.

## What is inside

- `packages/` - one package per domain, hand-written Zod models
- `docs/adr/` - decision record
- `tickets/` - the work queue; the rules live in `tickets/README.md`

## Notes for consumers

```sh
git submodule update --init contracts   # in the consumer repo
cd contracts && npm install             # once
```
