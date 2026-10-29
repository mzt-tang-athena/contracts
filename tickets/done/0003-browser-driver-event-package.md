---
id: 0003
title: Publish the browser driver event package
created: 2026-10-29
priority: normal
assignee: opencode
pr: 5
depends: []
---

## Spec

The browser driver publishes a run event stream. The dashboard, n8n, and
ntfy read it, so the schema goes here from the start (ADR 0001 in that
repo).

Add `packages/browser-driver` with the run event schema in Zod:

- `browserAction` - every action the browser can run
- `runOutcome` and `runStatus` - how a run ends and where it is now
- `runStats` - calls, time, tokens, and cost for the two models
- `runEvent` - the envelope and the five event types: `run.started`,
  `step`, `decision`, `approval.needed`, `run.finished`

Version `0.1.0`. The driver mirrors the same schema until it can install
this package, because the package needs a GitHub token.

## Acceptance

- [x] the package builds and typechecks in the workspace
- [x] tests accept one sample of every event type
- [x] tests reject an unknown type, a bad probability, and a bad action
- [x] the publish workflow covers the package tag

## Outcome

`@mzt-tang-athena/browser-driver@0.1.0` is in the workspace.

- `runAction` joins the six browser actions with the three run ends.
- `runEvent` covers the five stream events under one envelope.
- 9 tests cover every event type and the smaller schemas.
- The publish workflow takes the `browser-driver-v*` tag and leaves the
  `v*` tag to schemas.

The driver mirrors the same schema in `src/service/events.ts` for now.
It can install this package once a GitHub token is in its setup.
