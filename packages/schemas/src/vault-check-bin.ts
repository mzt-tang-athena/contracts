#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { runCli } from "./vault-check-cli.js";

const argv = process.argv.slice(2);
const stdin = argv.includes("--stdin") ? readFileSync(0, "utf8") : "";
const result = runCli(argv, stdin);
if (result.stdout !== "") process.stdout.write(result.stdout);
if (result.stderr !== "") process.stderr.write(result.stderr);
process.exitCode = result.code;
