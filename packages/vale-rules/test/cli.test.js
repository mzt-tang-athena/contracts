import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const PACKAGE = fileURLToPath(new URL("..", import.meta.url));
const BIN = path.join(PACKAGE, "bin", "vale-rules.js");

function run(args, cwd) {
  return spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: "utf8" });
}

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), "vale-rules-"));
}

test("sync copies the rule files into .vale/styles", async () => {
  const cwd = await tempDir();
  const result = run(["sync"], cwd);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /synced 6 rule files to \.vale\/styles/);

  const antithesis = await readFile(
    path.join(cwd, ".vale", "styles", "MyRules", "Antithesis.yml"),
    "utf8",
  );
  assert.match(antithesis, /extends: existence/);

  const lix = await readFile(
    path.join(cwd, ".vale", "styles", "Readability", "LIX.yml"),
    "utf8",
  );
  assert.match(lix, /condition: "> 35"/);
});

test("sync keeps styles that are not in the pack", async () => {
  const cwd = await tempDir();
  const writeGood = path.join(cwd, ".vale", "styles", "write-good");
  await mkdir(writeGood, { recursive: true });
  await writeFile(path.join(writeGood, "Passive.yml"), "extends: existence\n");

  const result = run(["sync"], cwd);
  assert.equal(result.status, 0, result.stderr);

  const kept = await readFile(path.join(writeGood, "Passive.yml"), "utf8");
  assert.equal(kept, "extends: existence\n");
});

test("sync takes a different styles path", async () => {
  const cwd = await tempDir();
  const result = run(["sync", "--styles", "prose"], cwd);
  assert.equal(result.status, 0, result.stderr);

  const drama = await readFile(
    path.join(cwd, "prose", "MyRules", "Drama.yml"),
    "utf8",
  );
  assert.match(drama, /extends: existence/);
});

test("an unknown command fails with usage", async () => {
  const cwd = await tempDir();
  const result = run(["copy"], cwd);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage: vale-rules sync/);
});
