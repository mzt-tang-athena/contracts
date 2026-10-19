# 0001. One contracts repo for home schemas

- **Status:** accepted
- **Date:** 2026-10-19

## Context

Schema definitions lived per project. The monkey-tasks vocabulary sat
in `packages/schemas` inside monkey-tasks. The plan now has several
projects sharing contracts: monkey-tasks, monkey budget, athena
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
another. No tokens or network are needed for local installs.
