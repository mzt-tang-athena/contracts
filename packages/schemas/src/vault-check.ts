import { readdirSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "./frontmatter.js";
import {
  agentFrontmatter,
  journalFileName,
  listFrontmatter,
  taskFrontmatter,
  taskWarningDetails,
} from "./vocabulary.js";

// The vault checker, per ADR 20261126-vault-writing-standards: one
// problem per value that breaks a note contract.

export type Severity = "error" | "warning";

export type Problem = {
  /** Vault-relative path, or an absolute path when the note is outside the vault. */
  path: string;
  /** The property at fault: a frontmatter key, `kind`, `types` or `file name`. */
  field: string;
  severity: Severity;
  message: string;
};

/** A note's kind already on disk, or null when the note does not exist yet. */
export type NoteInput = {
  /** Path as printed in a problem. */
  path: string;
  /** The note's text, or the text proposed for a note an agent is about to write. */
  text: string;
  /** Read only with `agent`. Null means the agent creates the note. */
  existingKind: string | null;
  /** Apply the operator's rule for agent writes. */
  agent: boolean;
};

/**
 * The note names `types` links resolve against. Called at most once per
 * run, and only when an agent note has types, so a single task note
 * never walks the vault.
 */
export type NoteNames = () => ReadonlySet<string>;

/** Folders that hold no notes. */
export const SKIP_FOLDERS: ReadonlySet<string> = new Set([
  ".obsidian",
  ".git",
  ".omp",
]);

export function checkNote(input: NoteInput, names: NoteNames): Problem[] {
  const problems: Problem[] = [];
  const add = (field: string, severity: Severity, message: string) => {
    problems.push({ path: input.path, field, severity, message });
  };

  if (isJournalPath(input.path)) {
    const fileName = input.path.split("\\").pop()?.split("/").pop() ?? "";
    if (!journalFileName.safeParse(fileName).success) {
      add(
        "file name",
        "warning",
        `expected a journal file name like 2026-11-26.md, not ${JSON.stringify(fileName)}`,
      );
    }
    return problems;
  }

  const values = parseFrontmatter(input.path, input.text).values;
  const kind = noteKind(values);

  if (input.agent) {
    if (input.existingKind == null && kind === "notes") {
      add(
        "kind",
        "error",
        "an agent never creates a kind notes note, which holds the operator's own thinking",
      );
    } else if (input.existingKind === "notes") {
      add(
        "kind",
        "warning",
        "this note is kind notes, the operator's own thinking",
      );
    }
  }

  switch (kind) {
    case "tasks":
    case "deeds": {
      const parsed = taskFrontmatter.safeParse(values);
      if (!parsed.success) addIssues(parsed.error.issues, add);
      for (const warning of taskWarningDetails(values)) {
        add(warning.field, "warning", warning.message);
      }
      break;
    }
    case "lists": {
      const parsed = listFrontmatter.safeParse(values);
      if (!parsed.success) addIssues(parsed.error.issues, add);
      break;
    }
    case "agents": {
      const parsed = agentFrontmatter.safeParse(values);
      if (!parsed.success) addIssues(parsed.error.issues, add);
      for (const link of linkValues(values.types)) {
        const target = linkTarget(link);
        if (target === "" || names().has(target.toLowerCase())) continue;
        add(
          "types",
          "error",
          `type ${JSON.stringify(link)} does not resolve to a note in the vault`,
        );
      }
      break;
    }
    default:
      break;
  }

  return problems;
}

type AddIssue = (field: string, severity: Severity, message: string) => void;

function addIssues(
  issues: readonly { path: PropertyKey[]; message: string }[],
  add: AddIssue,
): void {
  for (const issue of issues) {
    const field = issue.path.length === 0 ? "frontmatter" : issue.path.join(".");
    add(field, "error", issue.message);
  }
}

/** A note's kind as a bare value: `"[[agents]]"` and `agents` both read `agents`. */
export function noteKind(values: Record<string, unknown>): string | null {
  const raw = values.kind;
  if (typeof raw !== "string") return null;
  const bare = raw.trim().replace(/^\[\[/, "").replace(/\]\]$/, "").trim();
  return bare === "" ? null : bare;
}

function linkValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

/** The note name inside a wikilink: `[[folder/Note#heading|alias]]` reads `folder/Note`. */
function linkTarget(link: string): string {
  return link
    .trim()
    .replace(/^\[\[/, "")
    .replace(/\]\]$/, "")
    .split("|")[0]
    .split("#")[0]
    .trim()
    .replace(/\.md$/i, "")
    .replace(/^\.\//, "");
}

/** True for a note under a `Journal/Daily` folder, wherever the vault root sits. */
export function isJournalPath(path: string): boolean {
  const parts = path.split(/[\\/]/);
  return parts.some((part, index) => part === "Journal" && parts[index + 1] === "Daily");
}

/**
 * Every note name in the vault, lowercased: the file name alone, and the
 * path from the vault root without extension. Obsidian resolves a link
 * by either form, so both are in the set.
 */
export function noteNames(vaultRoot: string): Set<string> {
  const names = new Set<string>();
  const walk = (folder: string, prefix: string): void => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const path = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!SKIP_FOLDERS.has(entry.name)) walk(join(folder, entry.name), path);
        continue;
      }
      if (!entry.name.endsWith(".md") || entry.name === "AGENTS.md") continue;
      const stem = entry.name.slice(0, -".md".length).toLowerCase();
      names.add(stem);
      names.add(path.slice(0, -".md".length).toLowerCase());
    }
  };
  walk(vaultRoot, "");
  return names;
}

/** Every markdown note under a vault root, in a stable order. */
export function markdownFiles(vaultRoot: string): string[] {
  const files: string[] = [];
  const walk = (folder: string): void => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_FOLDERS.has(entry.name)) walk(join(folder, entry.name));
        continue;
      }
      if (entry.name.endsWith(".md") && entry.name !== "AGENTS.md") {
        files.push(join(folder, entry.name));
      }
    }
  };
  walk(vaultRoot);
  return files.sort();
}
