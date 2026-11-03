---
id: 0005
title: Roll out the Vale rules package to consumers
created: 2026-11-03
priority: normal
assignee:
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
| monkey-budget | yes | Antithesis, Drama, EmDash | yes | open |
| athena-infra | yes | Drama, EmDash, Plain, SentenceLength | yes | open |
| project-template | no, add one | Drama, EmDash | yes | open |
| contracts | yes | none, ticket 0004 removed Drama and EmDash | none, ticket 0004 removed it | done |
| browser-driver | yes | Drama, EmDash | yes | open |
| monkey-tasks | yes | Drama, EmDash | yes | open |
| my-dot-files | no, add one | Drama, EmDash, Plain, SentenceLength | yes | open |

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

The package needs `read:packages`. Use one of two routes:

1. `${{ secrets.GITHUB_TOKEN }}` with `permissions: packages: read` in
   the workflow. Pass it as `NODE_AUTH_TOKEN` to `actions/setup-node`
   with `registry-url: https://npm.pkg.github.com`. This works when the
   package access list includes the consumer repo.
2. A repo secret with a personal access token that has `read:packages`.
   Use this when the org package policy blocks the repo token.

Grant each consumer repo read access in the package settings when a
repo uses the first route. Keep the token in the step `env` only. Never echo
`.npmrc`, never print the token, and never commit it. setup-node writes
a temporary `.npmrc` for the job.

Local runs use the user's `~/.npmrc` token. The Makefile does not store
a token.

## Parity check

Run the repo's current prose command before the change and save the
output. Run the same command after sync and after deleting the local
files. Compare the file set, the error count and the warning count.

Example:

```sh
git ls-files '*.md' | sort > /tmp/vale-files-before.txt
git ls-files '*.md' | xargs vale --output=line > /tmp/vale-before.txt
# switch to the package
git ls-files '*.md' | sort > /tmp/vale-files-after.txt
git ls-files '*.md' | xargs vale --output=line > /tmp/vale-after.txt
diff /tmp/vale-files-before.txt /tmp/vale-files-after.txt
diff /tmp/vale-before.txt /tmp/vale-after.txt
```

The file lists must match. The reports must match, or the PR must
explain each difference. The done condition is 0 errors and no new
warnings.

## Acceptance

- [ ] every consumer row above links to a merged PR
- [ ] each consumer Makefile runs `npx vale-rules sync` before Vale
- [ ] each consumer CI prose job installs, authenticates, and syncs before Vale
- [ ] each consumer keeps its `write-good` clone step
- [ ] no consumer keeps a local `MyRules` copy
- [ ] no consumer keeps a local `Readability/LIX.yml` copy, unless it owns a different LIX rule
- [ ] repo-local overrides remain in `.vale.ini`
- [ ] each consumer PR records the parity file set and report
- [ ] each consumer PR has green CI
- [ ] my-dot-files installs the global rules from the package, not a vendored snapshot
- [ ] no consumer adds a second package or a submodule

## Progress

- 2026-11-03: coordination ticket added in PR #10. Rollout is open.

## Outcome

Open. Record the result here when every consumer PR has merged and CI
is green.
