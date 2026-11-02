#!/usr/bin/env node
import { cp, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const STYLES = fileURLToPath(new URL("../styles", import.meta.url));

function usage() {
  console.error("Usage: vale-rules sync [--styles <dir>]");
  console.error("");
  console.error("Copy the packaged styles into <dir>, by default .vale/styles.");
}

function parseArgs(argv) {
  if (argv[0] !== "sync") {
    return null;
  }
  let styles = ".vale/styles";
  for (let i = 1; i < argv.length; i += 1) {
    if (argv[i] === "--styles" && argv[i + 1]) {
      styles = argv[i + 1];
      i += 1;
    } else {
      return null;
    }
  }
  return { styles };
}

async function countRuleFiles(dir) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".yml")).length;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options) {
    usage();
    process.exitCode = 1;
    return;
  }

  const target = path.resolve(process.cwd(), options.styles);
  await mkdir(target, { recursive: true });
  await cp(STYLES, target, { recursive: true, force: true });
  const count = await countRuleFiles(STYLES);
  console.log(`vale-rules: synced ${count} rule files to ${options.styles}`);
}

main().catch((error) => {
  console.error(`vale-rules: ${error.message}`);
  process.exitCode = 1;
});
