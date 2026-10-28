---
id: 0001
title: Publish schemas as a versioned package
created: 2026-10-28
priority: high
assignee: opencode
pr: 2
depends: []
---

## Spec

Consumers pin this repo as a git submodule at a raw commit. That has
three costs. A consumer installs TypeScript source, so monkey-tasks
needs a custom Metro resolver. A schema change needs a manual bump in
every consumer. Nothing warns a consumer that it is behind: the app
was four commits behind and kept using the old parser.

Ship each package as a versioned npm package instead. A consumer asks
for a range, such as `^0.2.0`, and runs `npm outdated` to see when it
falls behind.

GitHub Packages requires the package scope to name the repository
owner, so the package becomes `@mzt-tang-athena/schemas` at `0.2.0`.

## Acceptance

- [ ] `packages/schemas` builds to `dist` with declarations
- [ ] the package publishes to GitHub Packages on a `v*` tag
- [ ] the CI checks tests, typecheck and the build
- [ ] the publish workflow fails when the tag does not match the version
- [ ] ADR 0001 records the change as a dated amendment
- [ ] the README tells a consumer how to install and a maintainer how to release

## Outcome

The package publishes to GitHub Packages as
`@mzt-tang-athena/schemas@0.2.0`. It builds to `dist`, so a consumer
installs compiled JavaScript and types. The publish workflow runs on a
`v*` tag and refuses a tag that does not match the version. A consumer
that falls behind shows in `npm outdated`.

The submodule stays until monkey-tasks moves. That change is separate
because another workflow holds that repo.

The registry needs a token for every install, even for a public
package. Each consumer sets one line in `.npmrc`.
