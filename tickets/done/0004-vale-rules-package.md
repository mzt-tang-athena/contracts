---
id: 0004
title: Publish the shared Vale rules package
created: 2026-11-02
priority: normal
assignee: opencode
pr: 7
depends: []
---

## Spec

Every repo carries its own copy of some `MyRules` YAML. monkey-budget
has Antithesis, Drama and EmDash. athena-infra and my-dot-files have
Drama, EmDash, Plain and SentenceLength. contracts, browser-driver,
monkey-tasks and project-template have Drama and EmDash. A rule change
means editing each copy.

Add `packages/vale-rules`, published as
`@mzt-tang-athena/vale-rules` v0.1.0 from GitHub Packages. It ships the
union of the rules as `styles/MyRules`, plus `Readability/LIX.yml` so
the pack stands alone. Third-party `write-good` stays a clone in each
repo.

The package ships a `vale-rules sync` command. It copies the packaged
styles into `.vale/styles`, which keeps each repo's single `StylesPath`
and its cloned `write-good`. Vale does not accept a list of style paths.
The command writes only the files in the pack and leaves other styles
alone.

## Acceptance

- [ ] the package holds Antithesis, Drama, EmDash, Plain, SentenceLength and LIX
- [ ] Antithesis reports the four sample claims and stays quiet on the clean sentence
- [ ] `vale-rules sync` copies the pack and leaves other styles in place
- [ ] the package README gives install, sync, CI and override notes
- [ ] the publish workflow takes the `vale-rules-v*` tag and checks the version
- [ ] an ADR records the package choice and the rejected alternatives
- [ ] repo checks pass and the package publishes as 0.1.0

## Follow-ups

This PR changes contracts only. Each consumer needs its own ticket and
PR. The steps are the same:

1. Add `@mzt-tang-athena/vale-rules@^0.1.0` as a dev dependency.
2. Run `npx vale-rules sync` before Vale in the Makefile and in CI.
3. Remove the local `.vale/styles/MyRules` copy.
4. Keep the repo's `.vale.ini` overrides and its `write-good` clone.

| Repo | Local rules to remove | Notes |
| --- | --- | --- |
| contracts | Drama, EmDash; Readability/LIX | Done in this PR |
| monkey-budget | Antithesis, Drama, EmDash | Already has the token for schemas |
| athena-infra | Drama, EmDash, Plain, SentenceLength | Keep `MyRules.SentenceLength = NO` for `AGENTS.md` |
| my-dot-files | Drama, EmDash, Plain, SentenceLength | No `package.json`; add one, or wrap the sync in the Makefile |
| browser-driver | Drama, EmDash | Add `npx vale-rules sync` to the docs CI job |
| monkey-tasks | Drama, EmDash | Check the nested `contracts` copy too |
| project-template | Drama, EmDash | No `package.json`; add one so new projects start with the dependency |

A repo whose docs CI job has no `npm ci` needs one step before sync, or
it can run the command from the code job, which already installs.

## Outcome

`@mzt-tang-athena/vale-rules@0.1.0` is in GitHub Packages. The registry
lists it as created on 2026-11-02.

The package holds six rule files: Antithesis, Drama, EmDash, Plain,
SentenceLength and `Readability/LIX.yml`. `vale-rules sync` copies them
into `.vale/styles` and leaves other styles alone. CLI tests cover the
copy, the merge and the custom path. The Vale test covers the four
Antithesis samples, the quiet clean sentence, and every rule firing.

contracts now uses the pack it publishes. The local `MyRules` and
`Readability` copies are gone, and the Makefile and docs CI run sync.

The first tag run published 0.1.0. The same run failed in the schemas
job, because the `v*` tag pattern also matched `vale-rules-v0.1.0`.
PR #8 makes the schemas job skip package tags. A second tag push hit a
409 because 0.1.0 already existed. The registry check shows the
published version.

Consumer follow-ups are in the table above. They stay out of this
ticket.
