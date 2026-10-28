# 0001. One contracts repo for home schemas

- **Status:** accepted
- **Date:** 2026-10-19

## Context

Schema definitions lived per project. The monkey-tasks vocabulary sat
in `packages/schemas` inside monkey-tasks. The plan now has more than
one project sharing contracts: monkey-tasks, monkey budget, athena
services, and future projects that each contribute and consume.

## Decision

One repo, `contracts`, holds all home-server schemas, one package per
domain under `packages/`. Projects depend on packages through a git
submodule and a `file:` dependency; no registry runs. The full
decision and its alternatives are ADR 0007 in monkey-tasks, written
the same day. This repo starts with the notes vocabulary as its first
package.

## Consequences

A schema change is a PR here, then consumers bump their submodule.
Packages are independent, so a change to one domain does not affect
another. Local installs need no token and no network.

Amendment 2026-10-28: each package carries a version and comes from a
registry (ticket 0001). We remove the submodule.

A consumer asks for a range, such as `^0.2.0`, instead of pinning a
commit. `npm outdated` then reports a consumer that falls behind. The
old setup hid that: the app was four commits behind this repo and kept
using the old parser.

Each package builds to `dist` with `tsc`. A consumer installs compiled
JavaScript and type declarations. The TypeScript source stays out of
the tarball. monkey-tasks needed a custom Metro resolver to read the
source; that resolver can go.

The package is `@mzt-tang-athena/schemas`, not `@monkey-tasks/schemas`.
GitHub Packages requires the scope to name the repository owner. The
old name was also wrong, because monkey budget reads the same
vocabulary.

We rejected a submodule pinned to a tag. A tag shows a version, but it
cannot express a range, and the bump stays manual.

The cost is a token. GitHub Packages needs a token to install a
package, even when the package is public. Each consumer sets one line
in `.npmrc`, or uses `actions/setup-node` in CI.
