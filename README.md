# contracts

Central schemas for the monkey projects and athena services. One
package per domain under `packages/`. Projects contribute their
schemas here and consume shared ones as versioned packages from
GitHub Packages (ADR 0001).

## Plan

1. `packages/schemas` - the notes vocabulary: task, deed, and list
   notes for monkey-tasks (moved from monkey-tasks, first tagged
   v0.1.0).
2. `packages/browser-driver` - the run event stream for the browser
   driver, tagged `browser-driver-v0.1.0`.
3. `packages/vale-rules` - the shared `MyRules` Vale style pack, tagged
   `vale-rules-v0.1.0`.
4. Next: a budget package when monkey budget starts.
5. Consumers move one at a time. monkey-tasks still pins the submodule
   until its own change lands.

## What is inside

- `packages/` - one package per domain, hand-written Zod models and
  the shared Vale style pack
- `docs/adr/` - decision record
- `tickets/` - the work queue; the rules live in `tickets/README.md`

## Notes for consumers

Point the scope at GitHub Packages. GitHub Packages needs a token even
for a public package, so add a personal access token with the
`read:packages` scope.

```sh
# ~/.npmrc
@mzt-tang-athena:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_TOKEN
```

Then install the package:

```sh
npm install @mzt-tang-athena/schemas@^0.2.0
```

A consumer that falls behind shows up in `npm outdated`.

`v0.1.0` was `@monkey-tasks/schemas`, read from a submodule. `v0.2.0`
is `@mzt-tang-athena/schemas`, read from the registry.

## Vale rules

`@mzt-tang-athena/vale-rules` holds the `MyRules` pack and the LIX rule.
Each repo adds the dependency and runs `npx vale-rules sync` before
Vale. The command copies the pack into `.vale/styles` and leaves
`write-good` and repo-local rules alone. Install and override notes
live in `packages/vale-rules/README.md`.

This repo runs the same command from the checkout, so it uses the pack
it publishes. The generated `.vale/styles/MyRules` and
`.vale/styles/Readability` directories are not committed.

## Release a package

Bump the version in the package's `package.json`, merge, then tag the
merge commit. The publish workflow checks that the tag and the version
agree, then publishes.

| Package | Tag |
| --- | --- |
| `schemas` | `v0.2.0` |
| `browser-driver` | `browser-driver-v0.1.0` |
| `vale-rules` | `vale-rules-v0.1.0` |

```sh
git tag vale-rules-v0.1.0
git push origin vale-rules-v0.1.0
```
