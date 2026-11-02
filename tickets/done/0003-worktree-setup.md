---
id: 0003
title: Add the worktree setup contract
created: 2026-11-02
priority: normal
assignee: opencode
pr:
depends: []
---

## Spec

The repo moved to `~/code/contracts/main`, but it has no worktree setup.
A new worktree starts with no `node_modules`, so its tests cannot run.

Add the harness-independent setup script:

- install every workspace with `npm ci` when dependencies are missing;
- write `.worktree.env` with the worktree and main paths.

This repo is a library. It serves no port, so the script assigns none.

Commit `.openchamber/project.json` so OpenChamber runs the script.

## Acceptance

- [x] the script refuses to run in the main checkout
- [x] a new worktree gets `node_modules`
- [x] a second run changes nothing
- [x] shellcheck and `make lint` pass

## Outcome

Merged 2026-11-02.
A new worktree installs the workspace dependencies and writes its paths.
