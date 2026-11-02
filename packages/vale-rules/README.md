# @mzt-tang-athena/vale-rules

Shared `MyRules` style pack for Vale. One source for the prose rules
that every repo uses.

## Install

GitHub Packages needs a token with the `read:packages` scope. Set the
scope in `~/.npmrc` once:

```sh
# ~/.npmrc
@mzt-tang-athena:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_TOKEN
```

Then add the package as a dev dependency:

```sh
npm install --save-dev @mzt-tang-athena/vale-rules@^0.1.0
```

## Use

The package writes into the styles path that `.vale.ini` already names.
Run the sync command before Vale:

```sh
npx vale-rules sync
vale README.md docs/*.md
```

The default target is `.vale/styles`. Pass `--styles <dir>` when
`StylesPath` points somewhere else.

```sh
npx vale-rules sync --styles prose/styles
```

`sync` copies the pack into the target and leaves every other style
alone. A cloned `write-good` and repo-local rules stay in place. Run it
again after a package update.

In CI, run the same command after `npm ci` and before `vale`:

```yaml
- run: npx vale-rules sync
- run: vale README.md docs/*.md
```

## What the pack holds

| File | Rule |
| --- | --- |
| `styles/MyRules/Antithesis.yml` | Drop the `, not X` tail, and the `not just X but Y` frame |
| `styles/MyRules/Drama.yml` | Replace drama words such as `robust` and `leverage` |
| `styles/MyRules/EmDash.yml` | Use a plain dash, not an em dash or en dash |
| `styles/MyRules/Plain.yml` | Drop filler such as `very`, `basically` and `simply` |
| `styles/MyRules/SentenceLength.yml` | Keep a sentence at 20 words or fewer |
| `styles/Readability/LIX.yml` | Keep the document LIX score below 35 |

Antithesis catches three shapes:

- `It is a cadence, not a purpose.`
- `Not just cheaper but faster.`
- `This is not a bug, it's a feature.`

It stays quiet on a plain claim: `Purpose decides the category.`

## Overrides

Keep repo-specific suppressions in `.vale.ini`, not in the pack. The
pack owns the rule files. A later `sync` overwrites them.

```ini
[AGENTS.md]
MyRules.SentenceLength = NO
```

A repo that needs a different rule writes a new rule file under its own
`StylesPath` and names it in `BasedOnStyles`. Do not fork a pack rule
in place.

## Third-party styles

The pack does not include `write-good`. Each repo keeps its clone, so
the upstream license and the upstream update stay with the repo. The
same holds for any other third-party style.
