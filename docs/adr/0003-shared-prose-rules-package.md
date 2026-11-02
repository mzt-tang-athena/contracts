# 0003. Shared prose rules come from a versioned package

- **Status:** accepted
- **Date:** 2026-11-02

## Context

Vale checks prose. A style pack named `MyRules` holds the home rules.
The pack lived as a copy in each repo. The copies drifted. monkey-budget
had three rules. athena-infra and my-dot-files had four. contracts,
browser-driver, monkey-tasks and project-template had two. A change to
one rule meant a change in every repo, and some repos never got it.

The repo rule in project-template says shared code is a versioned
package from GitHub Packages. The rule rejects copies and a git
submodule.

## Decision

`@mzt-tang-athena/vale-rules` is the one source for the pack. It holds
Antithesis, Drama, EmDash, Plain, SentenceLength and the LIX rule. It
lives in `packages/vale-rules` and publishes from GitHub Packages.

The package ships a small command, `vale-rules sync`. The command
copies the pack into `.vale/styles`. A repo keeps one `StylesPath`, as
Vale requires, and keeps its clone of `write-good`. The command writes
only the files in the pack. It leaves other styles alone.

We rejected three alternatives:

- **A copy in each repo.** This is the state we have. The copies
  already drifted, and a fix must land many times. Nothing reports a
  repo that falls behind.
- **A git submodule.** A submodule pins a commit, not a range. The
  update is manual. The old schemas package under a submodule left one
  app four commits behind without a signal. A submodule also breaks a
  plain `npm install`.
- **Chezmoi only.** Chezmoi writes dot files on one machine. It does
  not reach CI, a fresh clone, or a teammate. The rules must run in
  CI, so machine setup cannot be the only source.

The package beats a copy because a new version is one command for each
repo. It beats a submodule because a version range is visible and
`npm outdated` reports a stale repo. It beats chezmoi because the
source travels with the code into CI.

## Consequences

A rule change is one PR here, a tag, and a version bump in each repo.
A repo can pin an old pack while it cleans up warnings, then move
forward.

The package adds a dependency and a token. GitHub Packages needs a
token to install, even for a public package. Each repo already has
that token for the schemas package.

`sync` must run before Vale in a fresh clone and in CI. A repo that
forgets it fails on missing styles, which is easy to see and fix.

Repo-local choices stay local. A suppression such as
`MyRules.SentenceLength = NO` for one file lives in that repo's
`.vale.ini`. A new rule for one repo lives in its own style directory
under a new name. The pack stays the common set.

We do not package `write-good`. That is third-party code with its own
license and update path. Each repo keeps the clone it has.
