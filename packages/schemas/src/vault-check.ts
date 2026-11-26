import { readdirSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "./frontmatter.js";
import {
  agentFrontmatter,
  journalFileName,
  listFrontmatter,
  noteFrontmatter,
  referenceFrontmatter,
  taskFrontmatter,
  taskWarningDetails,
  waypointFrontmatter,
} from "./vocabulary.js";

// The vault checker, per ADR 20261126-vault-writing-standards: one
// problem per value that breaks a note contract.

export type Severity = "error" | "warning";

export type Problem = {
  /** Vault-relative path, or an absolute path when the note is outside the vault. */
  path: string;
  /**
   * The property at fault: a frontmatter key, `kind`, `types`, `file name`
   * or `folder`.
   */
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

/** Template folders at the vault root, whose notes hold placeholders, not values. */
export const TEMPLATE_FOLDERS: ReadonlySet<string> = new Set([
  "Templates",
  "_Templates",
  "90-Templates",
]);

/** Called once with each folder the walk could not read. */
export type WalkSkip = (folder: string) => void;

function readEntries(folder: string, onSkip?: WalkSkip) {
  try {
    return readdirSync(folder, { withFileTypes: true });
  } catch {
    onSkip?.(folder);
    return [];
  }
}

function skipFolder(name: string, atRoot: boolean): boolean {
  return SKIP_FOLDERS.has(name) || (atRoot && TEMPLATE_FOLDERS.has(name));
}

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
  const place = agentFolderPlace(input.path);

  if (place === "top" && kind !== "agents") {
    add(
      "kind",
      "error",
      kind === null
        ? "a note directly in Agents/ needs kind [[agents]]"
        : `a note directly in Agents/ must be kind [[agents]], not [[${kind}]]`,
    );
  }

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

  // The hooks never block the operator, so a malformed operator note is
  // only a warning there, and an error for an agent.
  const operatorSeverity: Severity = input.agent ? "error" : "warning";

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
    case "notes":
    case "references":
    case "waypoints": {
      const parsed = operatorSchema(kind).safeParse(values);
      if (!parsed.success) addIssues(parsed.error.issues, add, operatorSeverity);
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

  if (place === "nested") {
    add(
      "folder",
      "warning",
      "Agents/ is flat; a note belongs directly in Agents/",
    );
  }

  return problems;
}

type AddIssue = (field: string, severity: Severity, message: string) => void;

function addIssues(
  issues: readonly { path: PropertyKey[]; message: string }[],
  add: AddIssue,
  severity: Severity = "error",
): void {
  for (const issue of issues) {
    const field = issue.path.length === 0 ? "frontmatter" : issue.path.join(".");
    add(field, severity, issue.message);
  }
}

function operatorSchema(kind: "notes" | "references" | "waypoints") {
  switch (kind) {
    case "notes":
      return noteFrontmatter;
    case "references":
      return referenceFrontmatter;
    case "waypoints":
      return waypointFrontmatter;
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
 * Where a note sits in the vault's flat `Agents/` folder: directly in it,
 * in one of its subfolders, or anywhere else. An `Agents` folder deeper in
 * the vault, such as `Archive/Agents/`, is not this folder.
 */
export function agentFolderPlace(path: string): "top" | "nested" | null {
  const parts = path.split(/[\\/]/);
  if (parts[0] !== "Agents") return null;
  return parts.length === 2 ? "top" : "nested";
}

/**
 * Every note name in the vault, lowercased: the file name alone, and the
 * path from the vault root without extension. Obsidian resolves a link
 * by either form, so both are in the set.
 */
export function noteNames(vaultRoot: string, onSkip?: WalkSkip): Set<string> {
  const names = new Set<string>();
  const walk = (folder: string, prefix: string): void => {
    for (const entry of readEntries(folder, onSkip)) {
      const path = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!skipFolder(entry.name, prefix === "")) {
          walk(join(folder, entry.name), path);
        }
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
export function markdownFiles(
  vaultRoot: string,
  onSkip?: WalkSkip,
): string[] {
  const files: string[] = [];
  const walk = (folder: string, atRoot: boolean): void => {
    for (const entry of readEntries(folder, onSkip)) {
      if (entry.isDirectory()) {
        if (!skipFolder(entry.name, atRoot)) {
          walk(join(folder, entry.name), false);
        }
        continue;
      }
      if (entry.name.endsWith(".md") && entry.name !== "AGENTS.md") {
        files.push(join(folder, entry.name));
      }
    }
  };
  walk(vaultRoot, true);
  return files.sort();
}
