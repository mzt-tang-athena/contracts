import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const PACKAGE = fileURLToPath(new URL("..", import.meta.url));
const BIN = path.join(PACKAGE, "bin", "vale-rules.js");
const VALE = process.env.VALE_BIN ?? "vale";

const CONFIG = `StylesPath = .vale/styles
MinAlertLevel = warning

[*.md]
BasedOnStyles = MyRules, Readability
Readability.AutomatedReadability = NO
Readability.ColemanLiau = NO
Readability.FleschKincaid = NO
Readability.FleschReadingEase = NO
Readability.GunningFog = NO
Readability.SMOG = NO
Readability.Polysyllables = NO
`;

async function setup() {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "vale-rules-vale-"));
  const sync = spawnSync(process.execPath, [BIN, "sync"], { cwd, encoding: "utf8" });
  assert.equal(sync.status, 0, sync.stderr);
  await writeFile(path.join(cwd, ".vale.ini"), CONFIG);
  return cwd;
}

function lint(cwd, file) {
  const result = spawnSync(VALE, ["--output=JSON", file], {
    cwd,
    encoding: "utf8",
  });
  if (result.error?.code === "ENOENT") {
    throw new Error(`Vale binary not found. Install vale or set VALE_BIN.`);
  }
  assert.notEqual(result.status, 2, result.stderr);
  return JSON.parse(result.stdout);
}

test("Antithesis reports each opposed claim", async () => {
  const cwd = await setup();
  await writeFile(
    path.join(cwd, "claims.md"),
    [
      "It is a cadence, not a purpose.",
      "Not just cheaper but faster.",
      "This is not a bug, it's a feature.",
      "The key is the merchant, not the id.",
      "",
    ].join("\n"),
  );

  const report = lint(cwd, "claims.md");
  const alerts = Object.values(report)[0];
  const antithesis = alerts.filter((alert) => alert.Check === "MyRules.Antithesis");
  assert.deepEqual(
    antithesis.map((alert) => alert.Line).sort(),
    [1, 2, 3, 4],
  );
});

test("Antithesis stays quiet on a plain claim", async () => {
  const cwd = await setup();
  await writeFile(
    path.join(cwd, "plain.md"),
    "Purpose decides the category. Payment method and cadence never do.\n",
  );

  const report = lint(cwd, "plain.md");
  const alerts = Object.values(report)[0] ?? [];
  const antithesis = alerts.filter((alert) => alert.Check === "MyRules.Antithesis");
  assert.equal(antithesis.length, 0);
});

test("every packaged MyRules rule loads and fires", async () => {
  const cwd = await setup();
  await writeFile(
    path.join(cwd, "rules.md"),
    [
      "We leverage a robust plan.",
      "A dash \u2014 here.",
      "This is very simple.",
      "One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twentyone.",
      "",
    ].join("\n"),
  );

  const report = lint(cwd, "rules.md");
  const alerts = Object.values(report)[0];
  const rules = new Set(alerts.map((alert) => alert.Check));
  for (const rule of [
    "MyRules.Drama",
    "MyRules.EmDash",
    "MyRules.Plain",
    "MyRules.SentenceLength",
    "Readability.LIX",
  ]) {
    assert.ok(rules.has(rule), `${rule} did not fire: ${[...rules].join(", ")}`);
  }
});
