import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkNote } from "../src/vault-check.js";
import type { Problem } from "../src/vault-check.js";
import { runCli } from "../src/vault-check-cli.js";

const task = `---\nkind: "[[tasks]]"\ncreated: 2026-11-26\ntitle: Ship it\n---\n`;
const deed = `---\nkind: "[[deeds]]"\nstatus: "[[done]]"\ncompleted: 2026-11-26\n---\n`;
const list = `---\nkind: "[[lists]]"\ncreated: 2026-11-26\n---\n`;
const agent = `---\nkind: "[[agents]]"\ncreated: 2026-11-26\ncategories:\n  - "[[life engineering systems]]"\ntypes:\n  - "[[handover]]"\n---\n`;

const roots: string[] = [];

function makeVault(
  files: Record<string, string>,
  marker: string | null = ".obsidian",
): string {
  const root = mkdtempSync(join(tmpdir(), "vault-check-"));
  roots.push(root);
  if (marker !== null) {
    const file = join(root, marker, "marker");
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, "");
  }
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

function makeFolder(): string {
  const folder = mkdtempSync(join(tmpdir(), "vault-check-cwd-"));
  roots.push(folder);
  return folder;
}

afterEach(() => {
  while (roots.length > 0) {
    rmSync(roots.pop()!, { recursive: true, force: true });
  }
});

function check(
  path: string,
  text: string,
  options: { names?: string[]; existingKind?: string | null; agent?: boolean } = {},
): Problem[] {
  const names = new Set((options.names ?? []).map((name) => name.toLowerCase()));
  return checkNote(
    {
      path,
      text,
      existingKind: options.existingKind ?? null,
      agent: options.agent ?? false,
    },
    () => names,
  );
}

describe("checkNote", () => {
  it("passes a valid task, deed, list and agent note", () => {
    expect(check("Tasks/Ship it.md", task)).toEqual([]);
    expect(check("Deeds/Ship it.md", deed)).toEqual([]);
    expect(check("Tasks/Lists/Errands.md", list)).toEqual([]);
    expect(
      check("Agents/handover.md", agent, { names: ["handover"] }),
    ).toEqual([]);
  });

  it("reports a broken note of each kind", () => {
    const missingCreated = check("Tasks/mine.md", `---\nkind: "[[tasks]]"\n---\n`);
    expect(missingCreated).toContainEqual(
      expect.objectContaining({ field: "created", severity: "error" }),
    );

    const badList = check("Tasks/Lists/mine.md", `---\nkind: "[[lists]]"\n---\n`);
    expect(badList).toContainEqual(
      expect.objectContaining({ field: "created", severity: "error" }),
    );

    const badAgent = check(
      "Agents/mine.md",
      `---\nkind: "[[agents]]"\ncreated: 2026-11-26\n---\n`,
    );
    expect(badAgent).toContainEqual(
      expect.objectContaining({ field: "categories", severity: "error" }),
    );

    const badDate = check(
      "Agents/mine.md",
      `---\nkind: "[[agents]]"\ncreated: soon\ncategories: "[[work]]"\n---\n`,
    );
    expect(badDate).toContainEqual(
      expect.objectContaining({ field: "created", severity: "error" }),
    );
  });

  it("passes an unknown kind and a note with no kind", () => {
    expect(check("20-Projects/thing.md", `---\nkind: "[[project]]"\n---\n`)).toEqual([]);
    expect(check("Whatever.md", `# no frontmatter at all\n`)).toEqual([]);
  });

  it("warns about a task value the schema reads through a fallback", () => {
    const problems = check(
      "Tasks/mine.md",
      `---\nkind: "[[tasks]]"\ncreated: 2026-11-26\nalert weight: loud\n---\n`,
    );
    expect(problems).toContainEqual(
      expect.objectContaining({ field: "alert weight", severity: "warning" }),
    );
  });

  it("reports only the file name of a journal note, never its content", () => {
    const problems = check(
      "Journal/Daily/2026-02-30.md",
      `---\nkind: "[[tasks]]"\n---\nnot a task at all\n`,
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ field: "file name", severity: "warning" });

    expect(
      check("Journal/Daily/2026-11-26.md", `---\nkind: "[[tasks]]"\n---\n`),
    ).toEqual([]);
  });

  it("resolves types by bare name and by path from the vault root", () => {
    const withMissing = check("Agents/mine.md", agent, { names: ["other"] });
    expect(withMissing).toContainEqual(
      expect.objectContaining({ field: "types", severity: "error" }),
    );

    expect(check("Agents/mine.md", agent, { names: ["Handover"] })).toEqual([]);
    expect(
      check(
        "Agents/mine.md",
        agent.replace("[[handover]]", "[[Types/handover#top|a handover]]"),
        { names: ["types/handover"] },
      ),
    ).toEqual([]);
  });

  it("applies the agent rule only with agent mode", () => {
    const notes = `---\nkind: "[[notes]]"\n---\n`;
    expect(check("Agents/new.md", notes)).toEqual([]);
    expect(check("Agents/new.md", notes, { agent: true, existingKind: null })).toContainEqual(
      expect.objectContaining({ field: "kind", severity: "error" }),
    );
    expect(check("Agents/old.md", notes, { agent: true, existingKind: "notes" })).toContainEqual(
      expect.objectContaining({ field: "kind", severity: "warning" }),
    );
    expect(
      check("Agents/old.md", notes, { agent: true, existingKind: "agents" }),
    ).toEqual([]);
  });
});

describe("runCli", () => {
  it("checks one note and exits 0 in warn mode", () => {
    const root = makeVault({ "Tasks/broken.md": `---\nkind: "[[tasks]]"\n---\n` });
    const result = runCli([join(root, "Tasks/broken.md")], "", root);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(
      "Tasks/broken.md: created: a task note needs a created date\n",
    );
  });

  it("exits 1 in block mode on an error, and 0 on a warning", () => {
    const root = makeVault({
      "Tasks/broken.md": `---\nkind: "[[tasks]]"\n---\n`,
      "Tasks/warned.md": `---\nkind: "[[tasks]]"\ncreated: 2026-11-26\nalert weight: loud\n---\n`,
      "Journal/Daily/2026-02-30.md": `not a task\n`,
    });
    expect(runCli([root, "--block"], "", root).code).toBe(1);
    expect(runCli([join(root, "Tasks/warned.md"), "--block"], "", root).code).toBe(0);
    expect(
      runCli([join(root, "Journal/Daily/2026-02-30.md"), "--block"], "", root).code,
    ).toBe(0);
  });

  it("sweeps a vault, skipping AGENTS.md and the ignored folders", () => {
    const root = makeVault({
      "Tasks/broken.md": `---\nkind: "[[tasks]]"\n---\n`,
      "Tasks/AGENTS.md": `---\nkind: "[[tasks]]"\n---\n`,
      ".git/notes.md": `---\nkind: "[[tasks]]"\n---\n`,
      ".obsidian/notes.md": `---\nkind: "[[tasks]]"\n---\n`,
      ".omp/notes.md": `---\nkind: "[[tasks]]"\n---\n`,
      "Archive/old.md": `---\nkind: "[[project]]"\n---\n`,
    });
    const result = runCli([root, "--block"], "", root);
    expect(result.code).toBe(1);
    expect(result.stdout.trim().split("\n")).toEqual([
      "Tasks/broken.md: created: a task note needs a created date",
    ]);
  });

  it("skips an AGENTS.md file given directly", () => {
    const root = makeVault({ "Journal/Daily/AGENTS.md": "# folder rules\n" });
    const result = runCli([join(root, "Journal/Daily/AGENTS.md")], "", root);
    expect(result).toEqual({ code: 0, stdout: "", stderr: "" });
  });

  it("prints the same problems as JSON", () => {
    const root = makeVault({ "Tasks/broken.md": `---\nkind: "[[tasks]]"\n---\n` });
    const result = runCli([root, "--json"], "", root);
    expect(JSON.parse(result.stdout)).toEqual([
      {
        path: "Tasks/broken.md",
        field: "created",
        severity: "error",
        message: "a task note needs a created date",
      },
    ]);
  });

  it("checks proposed content from stdin against the vault", () => {
    const root = makeVault({
      "Agents/handover.md": `---\nkind: "[[agents]]"\ncreated: 2026-11-01\ncategories: "[[work]]"\n---\n`,
      "Agents/old.md": `---\nkind: "[[notes]]"\n---\n`,
    });
    const newNote = `---\nkind: "[[agents]]"\ncreated: 2026-11-26\ncategories: "[[work]]"\ntypes: "[[handover]]"\n---\n`;

    const pass = runCli(
      ["--stdin", "--path", "Agents/new.md", "--vault", root],
      newNote,
      root,
    );
    expect(pass).toMatchObject({ code: 0, stdout: "" });

    const notes = runCli(
      ["--stdin", "--path", "Agents/new.md", "--vault", root, "--agent", "--block"],
      `---\nkind: "[[notes]]"\n---\n`,
      root,
    );
    expect(notes.code).toBe(1);
    expect(notes.stdout).toContain("an agent never creates a kind notes note");

    const edit = runCli(
      ["--stdin", "--path", "Agents/old.md", "--vault", root, "--agent", "--block"],
      `---\nkind: "[[notes]]"\n---\nmore thinking\n`,
      root,
    );
    expect(edit.code).toBe(0);
    expect(edit.stdout).toBe(
      "Agents/old.md: kind: warning: this note is kind notes, the operator's own thinking\n",
    );
  });

  it("finds the vault root above a note that sits next to .obsidian", () => {
    const root = makeVault({
      ".obsidian/app.json": `{}`,
      "Agents/handover.md": `---\nkind: "[[agents]]"\ncreated: 2026-11-01\ncategories: "[[work]]"\n---\n`,
      "Agents/new.md": agent,
    });
    const result = runCli([join(root, "Agents/new.md"), "--block"], "", root);
    expect(result.code).toBe(0);
  });

  it("uses the folder above a swept subfolder as the vault root", () => {
    const root = makeVault({
      "handover-sheet.md": `# a note that types can point at\n`,
      "Agents/new.md": agent.replace("[[handover]]", "[[handover-sheet]]"),
    });
    const result = runCli([join(root, "Agents"), "--block"], "", root);
    expect(result).toEqual({ code: 0, stdout: "", stderr: "" });
  });

  it("sweeps the root when --vault is the only path given", () => {
    const root = makeVault({ "Tasks/broken.md": `---\nkind: "[[tasks]]"\n---\n` });
    const result = runCli(["--vault", root], "", makeFolder());
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(
      "Tasks/broken.md: created: a task note needs a created date\n",
    );
  });

  it("finds the vault root at a .git folder, with no .obsidian", () => {
    const root = makeVault(
      {
        ".git/HEAD": "ref: refs/heads/main\n",
        "Agents/handover.md": `---\nkind: "[[agents]]"\ncreated: 2026-11-01\ncategories: "[[work]]"\n---\n`,
        "Agents/new.md": agent,
      },
      null,
    );
    const result = runCli([join(root, "Agents/new.md"), "--block"], "", makeFolder());
    expect(result).toEqual({ code: 0, stdout: "", stderr: "" });
  });

  it("exits 2 when no .obsidian or .git folder is above the path", () => {
    const root = makeVault({ "Agents/new.md": agent }, null);
    const result = runCli([join(root, "Agents/new.md")], "", makeFolder());
    expect(result).toEqual({
      code: 2,
      stdout: "",
      stderr:
        "vault-check: no .obsidian or .git folder at or above this path; pass --vault <root>\n",
    });
  });

  it.skipIf(process.getuid?.() === 0)(
    "skips an unreadable folder and reports it once as a warning",
    () => {
      const root = makeVault({
        "Tasks/warned.md": `---\nkind: "[[tasks]]"\ncreated: 2026-11-26\nalert weight: loud\n---\n`,
        "Agents/new.md": agent,
        "handover.md": `# a note that types can point at\n`,
        "Locked/hidden.md": `---\nkind: "[[tasks]]"\n---\n`,
      });
      const locked = join(root, "Locked");
      chmodSync(locked, 0o000);
      try {
        const result = runCli([root, "--block"], "", root);
        expect(result.code).toBe(0);
        const lines = result.stdout.trim().split("\n");
        expect(
          lines.filter(
            (line) => line === "Locked: -: warning: unreadable, skipped",
          ),
        ).toHaveLength(1);
        expect(lines).toHaveLength(2);
      } finally {
        chmodSync(locked, 0o755);
      }
    },
  );

  it("skips template folders at the vault root, but not one deeper", () => {
    const broken = `---\nkind: "[[tasks]]"\n---\n`;
    const root = makeVault({
      "Templates/task template.md": broken,
      "_Templates/task template.md": broken,
      "90-Templates/task template.md": broken,
    });
    expect(runCli([root, "--block"], "", root)).toEqual({
      code: 0,
      stdout: "",
      stderr: "",
    });

    const nested = makeVault({ "Notes/Templates/real.md": broken });
    expect(runCli([nested, "--block"], "", nested).code).toBe(1);
  });

  it("refuses a bad invocation", () => {
    const root = makeVault({});
    expect(runCli([], "", root).code).toBe(2);
    expect(runCli(["--stdin"], "", root).code).toBe(2);
    expect(runCli(["--nope"], "", root).code).toBe(2);
    expect(runCli([join(root, "missing.md")], "", root).code).toBe(2);
    expect(runCli(["--vault", join(root, "missing"), root], "", root).code).toBe(2);
  });
});

const liveVault = "/home/monkey/vault/main";

describe.skipIf(!existsSync(liveVault))("live vault", () => {
  it("checks one agent note in under 200 ms, vault walk included", () => {
    const proposed = `---\nkind: "[[agents]]"\ncreated: 2026-11-26\ncategories: "[[work]]"\ntypes: "[[mstack]]"\n---\n`;
    const started = performance.now();
    const result = runCli(
      ["--stdin", "--path", "Agents/proposed.md", "--vault", liveVault],
      proposed,
    );
    const elapsed = performance.now() - started;
    expect(result.code).toBe(0);
    expect(result.stdout).toBe("");
    expect(elapsed).toBeLessThan(200);
  });

  it("sweeps the live vault root", () => {
    const result = runCli([liveVault, "--warn"], "");
    expect(result.code).toBe(0);
    for (const line of result.stdout.trim().split("\n")) {
      if (line === "") continue;
      expect(line).toMatch(/^[^:]+: [^:]+: /);
    }
  });
});
