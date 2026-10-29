---
id: 0003
title: Publish the browser driver event package
created: 2026-10-29
priority: normal
assignee: opencode
pr:
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

- [ ] the package builds and typechecks in the workspace
- [ ] tests accept one sample of every event type
- [ ] tests reject an unknown type, a bad probability, and a bad action
- [ ] the publish workflow covers the package tag

## Outcome

(filled in before moving to done/)
