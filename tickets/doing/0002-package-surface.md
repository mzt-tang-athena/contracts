---
id: 0002
title: Declare the package surface and check the tarball
created: 2026-10-28
priority: normal
assignee: opencode
pr: 3
depends: []
---

## Spec

`0.2.0` resolves by convention only. `main` and `types` point at
`dist`, and no `exports` map says which paths a consumer may reach.
Each consumer resolves it differently: Metro, Next and Node.

Three small changes:

1. Add an `exports` map, so the allowed entry points are explicit.
2. Add `engines`, to match the Node version in CI.
3. Run `publint` in CI, so a broken `main`, `types` or `files` path
   fails before a release.

`publint` checks the real tarball. `attw` waits until the package has a
second entry point or a CommonJS consumer.

## Acceptance

- [x] `package.json` carries `exports` and `engines`
- [x] CI runs `publint` after the build
- [x] `publint` reports no error
- [ ] `0.2.1` publishes and a consumer still imports it

## Outcome

(filled in before moving to done/)
