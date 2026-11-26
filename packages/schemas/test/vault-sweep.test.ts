import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { journalFileName, taskFrontmatter, validateNote } from "../src/index.js";

const vault = "/home/monkey/vault/main";
const journalFolder = join(vault, "Journal", "Daily");

describe.skipIf(!existsSync(vault))("live vault sweep", () => {
  it("every real task and deed note validates against the task schema", () => {
    const failures: string[] = [];
    let notes = 0;
    for (const folder of ["Tasks", "Deeds"]) {
      const dir = join(vault, folder);
      const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
      notes += files.length;
      for (const file of files) {
        const text = readFileSync(join(dir, file), "utf8");
        const result = validateNote(file, text, taskFrontmatter);
        if (result.errors) {
          failures.push(
            `${folder}/${file}: ${result.errors.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`,
          );
        }
      }
    }
    expect(notes).toBeGreaterThan(0);
    expect(failures).toEqual([]);
  });

  it.skipIf(!existsSync(journalFolder))(
    "every daily journal note has a real date for a name",
    () => {
      const files = readdirSync(journalFolder).filter(
        (f) => f.endsWith(".md") && f !== "AGENTS.md",
      );
      expect(files.length).toBeGreaterThan(0);
      expect(files.filter((f) => !journalFileName.safeParse(f).success)).toEqual([]);
    },
  );
});
