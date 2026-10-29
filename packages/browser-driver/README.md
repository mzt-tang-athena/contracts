# @mzt-tang-athena/browser-driver

The run event schema for the browser driver service.

A run is one goal in one browser. The service streams five event types:

| Type | When |
|---|---|
| `run.started` | the run opened a browser |
| `step` | one logged step: action, field fill, verify, refusal, or idle answer |
| `decision` | the compact record of what was chosen and why |
| `approval.needed` | an irreversible action waits for a human |
| `run.finished` | the run ended, always last |

Every event has the same envelope: `v`, `id`, `runId`, `seq`, `ts`, `type`,
and `data`. Read `type` first. A consumer that ignores unknown types stays
compatible when a later version adds one.

```ts
import { runEvent } from "@mzt-tang-athena/browser-driver";

const event = runEvent.parse(JSON.parse(line));
if (event.type === "run.finished") console.log(event.data.outcome);
```

Install it from GitHub Packages:

```sh
npm install @mzt-tang-athena/browser-driver@^0.1.0
```

The registry needs a token with `read:packages`, even for a public
package. See the repository README.
