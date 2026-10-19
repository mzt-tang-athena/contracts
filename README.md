# contracts

Central schemas for the monkey projects and athena services. One
package per domain under packages/. Consumers clone this repo as a
git submodule and depend on the package by file path (ADR 0007 in
monkey-tasks).

Update flow: PR here, tag a version, then consumers bump the submodule.
