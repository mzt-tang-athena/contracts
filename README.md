# contracts

Central schemas for the monkey projects and athena services. One
package per domain under `packages/`. Projects contribute their
schemas here and consume shared ones as versioned packages from
GitHub Packages (ADR 0001).

## Plan

1. `packages/schemas` - the notes vocabulary: task, deed, list and
   agent notes, and the journal file name. It moved from monkey-tasks
   and was first tagged v0.1.0.
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
npm install @mzt-tang-athena/schemas@^0.3.0
```

A consumer that falls behind shows up in `npm outdated`.

`v0.1.0` was `@monkey-tasks/schemas`, read from a submodule. `v0.2.0`
is `@mzt-tang-athena/schemas`, read from the registry. `v0.3.0` reads
a deed note as a task with a status, and drops the deed schema.
`v0.3.1` adds the agent note schema and the journal file name rule.
`v0.4.0` adds the `vault-check` command and its package bin.

## Vault check

`@mzt-tang-athena/schemas` ships `vault-check`, the one rule engine for
the vault. ADR `docs/adr/20261126-vault-writing-standards.md` says why.
It reads a note's `kind` and checks it against that kind's schema. It
also checks a journal file name, and resolves the `types` links on an
agent note against the vault's file names.

```sh
# one note, or a whole vault root
node packages/schemas/dist/vault-check-bin.js ~/vault/main/Agents/x.md
node packages/schemas/dist/vault-check-bin.js ~/vault/main

# text an agent has not written yet, as a hook sees it
node packages/schemas/dist/vault-check-bin.js --stdin \
  --path Agents/x.md --vault ~/vault/main --agent < proposed.md
```

| Flag | Meaning |
|---|---|
| `--vault <root>` | the vault root; discovered when absent |
| `--agent` | an agent never creates a `kind: "[[notes]]"` note; editing one warns |
| `--warn` | print problems and exit 0 (default) |
| `--block` | exit 1 on an error; warnings never fail |
| `--json` | print the problems as JSON |

Without `--vault`, the checker walks up from the note's folder to the
nearest folder holding `.obsidian` or `.git`. If there is none, it
exits 2 and asks for `--vault`. It never reads the cwd. A vault root
alone, as `<path>` or as `--vault <root>`, checks every note under it.

A problem prints as `path: field: message`, and a warning's message
starts with `warning: `. The checker reads only the file name of a note
under `Journal/Daily/`. A bad name is a warning, so a journal write is
never blocked. The checker skips `AGENTS.md` files, the `.obsidian`,
`.git` and `.omp` folders, and the `Templates`, `_Templates` and
`90-Templates` folders at the vault root. An unreadable folder gets one
warning, `path: -: warning: unreadable, skipped`.

### Run it today

The registry has no `0.3.x` release: those tags were never pushed. Run
the command from a checkout:

```sh
npm ci && npm run build
node packages/schemas/dist/vault-check-bin.js --vault ~/vault/main
```

To get it on `PATH`, publish the package. Tag the merge commit and let
the publish workflow run, or publish by hand from a machine with a
`write:packages` token:

```sh
npm publish --workspace @mzt-tang-athena/schemas
npm install @mzt-tang-athena/schemas@^0.4.0
node_modules/.bin/vault-check --vault ~/vault/main
```

The publish workflow checks that the tag matches the version, so bump
the version before you tag.

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
| `schemas` | `v0.4.0` |
| `browser-driver` | `browser-driver-v0.1.0` |
| `vale-rules` | `vale-rules-v0.1.0` |

```sh
git tag v0.4.0
git push origin v0.4.0
```
