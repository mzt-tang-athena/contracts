---
id: 0005
title: Roll out the Vale rules package to consumers
created: 2026-11-03
priority: normal
assignee: opencode
pr: 10
depends: []
---

## Spec

The org registry confirms `@mzt-tang-athena/vale-rules@0.1.0`. ADR 0003
makes it the one source for the `MyRules` pack. contracts is the
producer and already uses the pack from its checkout (ticket 0004). The
other repos still carry local copies.

This ticket tracks the rollout. It records the plan and the done
condition. Do not edit another repo here. Each consumer gets its own
ticket and PR, under that repo's ticket and ADR rules. Each consumer PR
links back to this ticket.

The rollout finishes only when every consumer merges its PR and CI is
green.

## Consumers

| Repo | `package.json` | Local `MyRules` today | Local `Readability/LIX.yml` | State |
| --- | --- | --- | --- | --- |
| monkey-budget | yes | Antithesis, Drama, EmDash | yes | done, PR 24 |
| athena-infra | yes | Drama, EmDash, Plain, SentenceLength | yes | done, PR 18 |
| project-template | no, add one | Drama, EmDash | yes | done, PR 6 |
| contracts | yes | none, ticket 0004 removed Drama and EmDash | none, ticket 0004 removed it | done |
| browser-driver | yes | Drama, EmDash | yes | done, PR 16 |
| monkey-tasks | yes | Drama, EmDash | yes | done, PR 78 |
| my-dot-files | no, add one | Drama, EmDash, Plain, SentenceLength | yes | done, PR 11 |

contracts is the reference. Its Makefile and docs CI run sync from the
workspace package. A consumer PR can copy that wiring, then use the
registry package.

## Per-repo checklist

Each consumer ticket must cover these steps:

1. Add `@mzt-tang-athena/vale-rules@^0.1.0` as a dev dependency. A repo
   without `package.json` adds a small private one with the dependency
   and a lockfile.
2. Run `npx vale-rules sync` before Vale in `make lint` and in the CI
   prose job. Keep the existing `write-good` clone step. `sync` leaves
   that directory alone.
3. Delete the local `.vale/styles/MyRules` files. Do not copy them into
   the package again.
4. Delete the local `.vale/styles/Readability/LIX.yml`. The pack ships
   it. Keep any other `Readability` rule that the repo owns.
5. Keep repo-local overrides in `.vale.ini`. athena-infra keeps
   `[AGENTS.md] MyRules.SentenceLength = NO`.
6. Prove parity. Record the same file set before and after the switch.
   The old and new rule files must report the same 0 errors. Warnings
   must not change either.
7. Open one PR per repo. Follow that repo's own ticket and ADR rules.

The CI prose job in most consumers has no `npm ci` today. Add the
install step before sync, or run sync from the code job, which already
installs. Do not add a second package or a vendored copy.

## Special cases

### project-template

Add a small private `package.json` with the dev dependency. The
template still serves repos that do not use Node at runtime. Node is
only the tool that syncs prose rules. New repos then inherit the
dependency, the sync command, and a CI prose job that installs before
Vale.

### my-dot-files

The global Vale config lives outside any repo, so a repo sync cannot
update it. The global copy does not stay as a vendored snapshot. The
my-dot-files installer pulls the pinned package and syncs it into the
global styles path:

```sh
npm ci
npx vale-rules sync --styles "$HOME/.local/share/vale/styles"
```

The repo gets the same small `package.json` as project-template.
The installer needs the user's GitHub Packages token in `~/.npmrc`.

The global files become generated output, not committed copies. The
my-dot-files PR records the cost. Bootstrap needs network and a token
once. A machine that only applies chezmoi without the installer does
not get the global rules.

### contracts

No consumer PR. Ticket 0004 already removed the copies and wired sync
from the workspace. This ticket uses it as the reference.

## CI auth

The package needs `read:packages`. The organization is on GitHub Free,
and on Free an organization secret does not reach a private repository.
So the routes split:

- A public repo uses the organization secret `VALE_RULES_TOKEN`.
- A private repo uses a repository secret of the same name and value.

Both carry a personal access token (classic) with `read:packages`. The
workflow passes it as `NODE_AUTH_TOKEN`:

```yaml
        env:
          NODE_AUTH_TOKEN: ${{ secrets.VALE_RULES_TOKEN }}
```

Do not use `secrets.GITHUB_TOKEN`, and do not add
`permissions: packages: read`. A repository token belongs to the
consumer, so it cannot read a package linked to `contracts`.

A new private repo adds the secret with one command:

```sh
gh secret set VALE_RULES_TOKEN --repo OWNER/REPO
```

Keep the token in the step `env` only. Never echo `.npmrc`, never print
the token, and never commit it.
