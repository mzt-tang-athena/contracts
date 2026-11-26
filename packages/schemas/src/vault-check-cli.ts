import { existsSync, readFileSync, statSync } from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { parseFrontmatter } from "./frontmatter.js";
import {
  checkNote,
  markdownFiles,
  noteKind,
  noteNames,
} from "./vault-check.js";
import type { Problem } from "./vault-check.js";

export type CliResult = {
  code: number;
  stdout: string;
  stderr: string;
};

const USAGE = `vault-check: check vault notes against the note contracts

usage: vault-check [<path>] [options]
       vault-check --stdin --path <path> [options]

  <path>          one note, or a vault root to check every note under it
  --stdin         read the note text from stdin, for a write that has not happened yet
  --path <path>   the note's path, with or without --stdin; vault-relative or absolute
  --vault <root>  the vault root; default: the nearest folder at or above the
                  path that holds .obsidian or .git, else exit 2
  --agent         apply the operator's rule for agent writes: a new kind notes note
                  is an error, an edit to an existing one is a warning
  --warn          print problems and exit 0 (default)
  --block         exit 1 when a problem is an error; warnings never fail
  --json          print the problems as JSON
  -h, --help      print this help

output: one line per problem, "path: field: message"; a warning's message
starts with "warning: ". A folder the checker cannot read is skipped with
"path: -: warning: unreadable, skipped".
agents folder: a note directly in Agents/ must be kind agents, or it is an
error. A note in an Agents/ subfolder is a warning, because the folder is flat.
`;

type Options = {
  stdin: boolean;
  target: string;
  vault: string | null;
  agent: boolean;
  block: boolean;
  json: boolean;
  help: boolean;
};

type Parsed = { ok: true; options: Options } | { ok: false; error: string };

function parseArgs(argv: string[]): Parsed {
  let stdin = false;
  let agent = false;
  let block = false;
  let json = false;
  let help = false;
  let vault: string | null = null;
  let target: string | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--stdin":
        stdin = true;
        break;
      case "--agent":
        agent = true;
        break;
      case "--warn":
        block = false;
        break;
      case "--block":
        block = true;
        break;
      case "--json":
        json = true;
        break;
      case "-h":
      case "--help":
        help = true;
        break;
      case "--path":
      case "--vault": {
        const value = argv[index + 1];
        if (value === undefined) {
          return { ok: false, error: `${arg} needs a path` };
        }
        index += 1;
        if (arg === "--vault") {
          vault = value;
          break;
        }
        if (target !== null) {
          return { ok: false, error: "give one note path only" };
        }
        target = value;
        break;
      }
      default: {
        if (arg.startsWith("-")) {
          return { ok: false, error: `unknown option: ${arg}` };
        }
        if (target !== null) {
          return { ok: false, error: "give one note path only" };
        }
        target = arg;
      }
    }
  }

  if (!help) {
    if (stdin && target === null) {
      return { ok: false, error: "--stdin needs --path <path>" };
    }
    if (!stdin && target === null && vault === null) {
      return { ok: false, error: "give a note path or --vault <root>" };
    }
  }

  return {
    ok: true,
    options: {
      stdin,
      target: target ?? "",
      vault,
      agent,
      block,
      json,
      help,
    },
  };
}

/** The nearest folder at or above `start` that holds .obsidian or .git, else null. */
function findVault(start: string): string | null {
  let folder = start;
  for (;;) {
    if (
      existsSync(join(folder, ".obsidian")) ||
      existsSync(join(folder, ".git"))
    ) {
      return folder;
    }
    const parent = dirname(folder);
    if (parent === folder) return null;
    folder = parent;
  }
}

/** Vault-relative when the note sits inside the vault, else absolute. */
function displayPath(file: string, vault: string): string {
  const rel = relative(vault, file);
  if (rel === "") return ".";
  if (rel.startsWith("..") || isAbsolute(rel)) return file;
  return rel.split(sep).join("/");
}

function readNote(file: string): string | null {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

export function runCli(
  argv: string[],
  stdin: string,
  cwd = process.cwd(),
): CliResult {
  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    return {
      code: 2,
      stdout: "",
      stderr: `vault-check: ${parsed.error}\n\n${USAGE}`,
    };
  }
  const options = parsed.options;
  if (options.help) return { code: 0, stdout: USAGE, stderr: "" };

  const vaultFlag = options.vault === null ? null : resolve(cwd, options.vault);
  if (vaultFlag !== null && !existsSync(vaultFlag)) {
    return {
      code: 2,
      stdout: "",
      stderr: `vault-check: no such vault: ${vaultFlag}\n`,
    };
  }
  if (vaultFlag !== null && !options.stdin && options.target === "") {
    options.target = vaultFlag;
  }

  let target: string;
  if (options.stdin) {
    target = isAbsolute(options.target)
      ? options.target
      : resolve(vaultFlag ?? cwd, options.target);
  } else {
    target = resolve(cwd, options.target);
    if (!existsSync(target)) {
      return {
        code: 2,
        stdout: "",
        stderr: `vault-check: no such path: ${target}\n`,
      };
    }
  }

  const sweep = !options.stdin && statSync(target).isDirectory();
  if (!sweep && basename(target) === "AGENTS.md") {
    return { code: 0, stdout: options.json ? "[]\n" : "", stderr: "" };
  }
  const vault = vaultFlag ?? findVault(sweep ? target : dirname(target));
  if (vault === null) {
    return {
      code: 2,
      stdout: "",
      stderr:
        "vault-check: no .obsidian or .git folder at or above this path; pass --vault <root>\n",
    };
  }

  const problems: Problem[] = [];
  const files: { file: string; text: string }[] = [];
  const skipped = new Set<string>();
  const reportSkip = (file: string) => {
    const path = displayPath(file, vault);
    if (skipped.has(path)) return;
    skipped.add(path);
    problems.push({
      path,
      field: "-",
      severity: "warning",
      message: "unreadable, skipped",
    });
  };

  if (options.stdin) {
    files.push({ file: target, text: stdin });
  } else if (sweep) {
    for (const file of markdownFiles(target, reportSkip)) {
      const text = readNote(file);
      if (text === null) {
        reportSkip(file);
      } else {
        files.push({ file, text });
      }
    }
  } else {
    const text = readNote(target);
    if (text === null) {
      return {
        code: 2,
        stdout: "",
        stderr: `vault-check: cannot read ${target}\n`,
      };
    }
    files.push({ file: target, text });
  }

  let names: Set<string> | null = null;
  const resolveNames = () => (names ??= noteNames(vault, reportSkip));

  for (const { file, text } of files) {
    const existingKind = options.agent
      ? options.stdin
        ? kindOnDisk(file)
        : kindOfText(text)
      : null;
    problems.push(
      ...checkNote(
        {
          path: displayPath(file, vault),
          text,
          existingKind,
          agent: options.agent,
        },
        resolveNames,
      ),
    );
  }

  const stdout = options.json
    ? `${JSON.stringify(problems, null, 2)}\n`
    : problems
        .map(
          (problem) =>
            `${problem.path}: ${problem.field}: ${
              problem.severity === "warning" ? "warning: " : ""
            }${problem.message}`,
        )
        .join("\n") + (problems.length === 0 ? "" : "\n");

  const failed =
    options.block && problems.some((problem) => problem.severity === "error");
  return { code: failed ? 1 : 0, stdout, stderr: "" };
}

function kindOfText(text: string): string | null {
  return noteKind(parseFrontmatter("", text).values);
}

function kindOnDisk(file: string): string | null {
  const text = readNote(file);
  return text === null ? null : kindOfText(text);
}
