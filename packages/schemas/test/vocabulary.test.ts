import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  agentFrontmatter,
  journalFileName,
  listFrontmatter,
  taskFrontmatter,
  taskIsDone,
  taskWarnings,
  validateNote,
  wikilinkTarget,
  type AlertWeight,
  type TaskStatus,
} from "../src/index.js";
import { parseFrontmatter } from "../src/frontmatter.js";

/** A note's text from its frontmatter lines, as Obsidian stores it. */
function note(...lines: string[]): string {
  return ["---", ...lines, "---", ""].join("\n");
}

describe("taskFrontmatter", () => {
  it("accepts a minimal task note", () => {
    const result = taskFrontmatter.safeParse({
      kind: "[[tasks]]",
      created: "2026-10-19",
    });
    expect(result.success).toBe(true);
  });

  it("reads a bare kind and returns the link form", () => {
    const result = taskFrontmatter.safeParse({
      kind: "tasks",
      created: "2026-10-19",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kind).toBe("[[tasks]]");
    }
  });

  it("reads the link kind unchanged", () => {
    const result = taskFrontmatter.safeParse({
      kind: "[[tasks]]",
      created: "2026-10-19",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kind).toBe("[[tasks]]");
    }
  });

  it("rejects another kind in either shape", () => {
    for (const kind of ["lists", "[[lists]]", "[[list]]", "notes", "[[notes]]", ""]) {
      const result = taskFrontmatter.safeParse({
        kind,
        created: "2026-10-19",
      });
      expect(result.success).toBe(false);
    }
  });

  it("accepts a full task note and preserves unknown properties", () => {
    const result = taskFrontmatter.safeParse({
      kind: "[[tasks]]",
      created: "2026-10-19",
      completed: "2026-10-20",
      due: "2026-10-21",
      reminders: ["2026-10-21T14:50", "2026-10-21T15:00"],
      recurrence: "FREQ=MONTHLY",
      lists: ["[[groceries]]"],
      "obsidian-plugin-noise": { deep: true },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recurrence).toBe("FREQ=MONTHLY");
      expect(result.data["obsidian-plugin-noise"]).toEqual({ deep: true });
    }
  });

  it("accepts an occurrence note with a title and a previous occurrence", () => {
    const result = taskFrontmatter.safeParse({
      kind: "[[tasks]]",
      title: "Water plants",
      created: "2026-10-20",
      "recurrence previous": "[[Water plants 2026-09-20]]",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Water plants");
      expect(result.data["recurrence previous"]).toBe("[[Water plants 2026-09-20]]");
    }
  });

  it("accepts a creation date with or without a time", () => {
    for (const created of ["2026-10-19", "2026-10-19T14:03"]) {
      const result = taskFrontmatter.safeParse({
        kind: "[[tasks]]",
        created,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.created).toBe(created);
      }
    }
  });

  it("accepts a completion date with or without a time", () => {
    for (const completed of ["2026-11-11", "2026-11-11T18:08"]) {
      const result = taskFrontmatter.safeParse({
        kind: "[[tasks]]",
        created: "2026-11-11",
        completed,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.completed).toBe(completed);
      }
    }
  });

  it("rejects a completion that is not a date or a datetime", () => {
    for (const completed of ["yesterday", "2026-11-11 18:08", "11-11-2026"]) {
      const result = taskFrontmatter.safeParse({
        kind: "[[tasks]]",
        created: "2026-11-11",
        completed,
      });
      expect(result.success).toBe(false);
    }
  });

  it("reads a manual order from a number or from its text form", () => {
    for (const order of [3, "3"]) {
      const result = taskFrontmatter.safeParse({
        kind: "[[tasks]]",
        created: "2026-10-19",
        order,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.order).toBe(3);
      }
    }
  });

  it("reads a list as one wikilink and keeps no legacy field", () => {
    const result = taskFrontmatter.safeParse({
      kind: "[[tasks]]",
      created: "2026-10-19",
      list: "[[Focus]]",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.list).toBe("[[Focus]]");
      expect(result.data).not.toHaveProperty("lists");
    }
  });

  it("resolves a legacy lists to its first link", () => {
    const result = taskFrontmatter.safeParse({
      kind: "[[tasks]]",
      created: "2026-10-19",
      lists: ["[[Focus]]", "[[Home]]"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.list).toBe("[[Focus]]");
      expect(result.data).not.toHaveProperty("lists");
    }
  });

  it("keeps an explicit list over a legacy lists", () => {
    const result = taskFrontmatter.safeParse({
      kind: "[[tasks]]",
      created: "2026-10-19",
      list: "[[Focus]]",
      lists: ["[[Home]]"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.list).toBe("[[Focus]]");
      expect(result.data).not.toHaveProperty("lists");
    }
  });

  it("leaves list absent when neither field is present", () => {
    const result = taskFrontmatter.safeParse({
      kind: "[[tasks]]",
      created: "2026-10-19",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("list");
    }
  });

  it("reads an empty list value as null", () => {
    const result = taskFrontmatter.safeParse({
      kind: "[[tasks]]",
      created: "2026-10-19",
      list: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.list).toBeNull();
    }
  });

  it("rejects an empty string list", () => {
    const result = taskFrontmatter.safeParse({
      kind: "[[tasks]]",
      created: "2026-10-19",
      list: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a block under list", () => {
    const result = taskFrontmatter.safeParse({
      kind: "[[tasks]]",
      created: "2026-10-19",
      list: ["[[Focus]]"],
    });
    expect(result.success).toBe(false);
  });

  it("keeps an explicit empty list over a legacy lists", () => {
    const result = taskFrontmatter.safeParse({
      kind: "[[tasks]]",
      created: "2026-10-19",
      list: null,
      lists: ["[[Focus]]"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.list).toBeNull();
      expect(result.data).not.toHaveProperty("lists");
    }
  });

  it("rejects a malformed legacy lists", () => {
    const result = taskFrontmatter.safeParse({
      kind: "[[tasks]]",
      created: "2026-10-19",
      lists: [{}],
    });
    expect(result.success).toBe(false);
  });

  it("wraps a bare recurrence previous value", () => {
    const result = taskFrontmatter.safeParse({
      kind: "[[tasks]]",
      created: "2026-10-20",
      "recurrence previous": "Water plants 2026-10-20",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data["recurrence previous"]).toBe("[[Water plants 2026-10-20]]");
    }
  });

  it("accepts a task with neither title nor recurrence previous", () => {
    const result = taskFrontmatter.safeParse({
      kind: "[[tasks]]",
      created: "2026-10-19",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBeUndefined();
      expect(result.data["recurrence previous"]).toBeUndefined();
    }
  });

  it("rejects an empty title", () => {
    const result = taskFrontmatter.safeParse({
      kind: "[[tasks]]",
      title: "",
      created: "2026-10-19",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a task with a broken recurrence", () => {
    const result = taskFrontmatter.safeParse({
      kind: "[[tasks]]",
      created: "2026-10-19",
      recurrence: "monthly",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a task with a malformed date", () => {
    const result = taskFrontmatter.safeParse({
      kind: "[[tasks]]",
      created: "19-10-2026",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a task note with no created date", () => {
    expect(taskFrontmatter.safeParse({ kind: "[[tasks]]" }).success).toBe(false);
    expect(
      taskFrontmatter.safeParse({ kind: "[[tasks]]", created: null }).success,
    ).toBe(false);
  });

  it("reads each of the five statuses", () => {
    for (const name of ["backlog", "active", "done", "dropped", "someday"] as const) {
      const result = taskFrontmatter.safeParse({
        kind: "[[tasks]]",
        created: "2026-10-19",
        status: `[[${name}]]`,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(`[[${name}]]`);
      }
    }
  });

  it("keeps status optional and typed as a TaskStatus", () => {
    const input: z.input<typeof taskFrontmatter> = {
      kind: "tasks",
      created: "2026-10-19",
      status: "backlog",
    };
    const status: TaskStatus | null | undefined = taskFrontmatter.parse(input).status;
    expect(status).toBe("[[backlog]]");
  });

  it("reads a bare status value and wraps it", () => {
    const result = taskFrontmatter.safeParse({
      kind: "[[tasks]]",
      created: "2026-10-19",
      status: "backlog",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("[[backlog]]");
    }
  });

  it("reads an empty status property as null", () => {
    const result = taskFrontmatter.safeParse({
      kind: "[[tasks]]",
      created: "2026-10-19",
      status: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBeNull();
    }
  });

  it("rejects an unknown status", () => {
    const result = taskFrontmatter.safeParse({
      kind: "[[tasks]]",
      created: "2026-10-19",
      status: "[[paused]]",
    });
    expect(result.success).toBe(false);
  });

  it("reads blocked by from one link or from two", () => {
    const one = taskFrontmatter.parse({
      kind: "[[tasks]]",
      created: "2026-10-19",
      "blocked by": "[[gather the quarterly notes]]",
    });
    expect(one["blocked by"]).toEqual(["[[gather the quarterly notes]]"]);

    const two = taskFrontmatter.parse({
      kind: "[[tasks]]",
      created: "2026-10-19",
      "blocked by": ["[[gather the quarterly notes]]", "[[file the receipts]]"],
    });
    expect(two["blocked by"]).toEqual([
      "[[gather the quarterly notes]]",
      "[[file the receipts]]",
    ]);
  });

  it("keeps after as legacy and never reads it as blocked by", () => {
    const parsed = taskFrontmatter.parse({
      kind: "[[tasks]]",
      created: "2026-10-19",
      after: "[[create a recurring checklist template]]",
    });
    expect(parsed.after).toEqual(["[[create a recurring checklist template]]"]);
    expect(parsed["blocked by"]).toBeUndefined();
  });

  it("rejects a broken after or a broken blocked by", () => {
    for (const key of ["after", "blocked by"]) {
      const result = taskFrontmatter.safeParse({
        kind: "[[tasks]]",
        created: "2026-10-19",
        [key]: [{}],
      });
      expect(result.success).toBe(false);
    }
  });
});

describe("alert weight", () => {
  const minimal = { kind: "[[tasks]]", created: "2026-10-19" };

  it("reads an absent value as harsh", () => {
    expect(taskFrontmatter.parse(minimal)["alert weight"]).toBe("harsh");
  });

  it("keeps the input optional and the output an AlertWeight", () => {
    const input: z.input<typeof taskFrontmatter> = minimal;
    const weight: AlertWeight = taskFrontmatter.parse(input)["alert weight"];
    expect(weight).toBe("harsh");
  });

  it("reads each stored value", () => {
    for (const weight of ["harsh", "quiet"] as const) {
      const result = taskFrontmatter.safeParse({
        ...minimal,
        "alert weight": weight,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data["alert weight"]).toBe(weight);
      }
    }
  });

  it("reads a null value as harsh", () => {
    const result = taskFrontmatter.safeParse({
      ...minimal,
      "alert weight": null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data["alert weight"]).toBe("harsh");
    }
  });

  it("reads an unreadable value as harsh and keeps the note valid", () => {
    for (const weight of ["loud", "Quiet", 5, ""]) {
      const result = taskFrontmatter.safeParse({
        ...minimal,
        "alert weight": weight,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data["alert weight"]).toBe("harsh");
      }
    }
  });

  it("reads the spaced key from a note's text", () => {
    const text = [
      "---",
      'kind: "[[tasks]]"',
      "created: 2026-10-19",
      "alert weight: quiet",
      "---",
      "",
    ].join("\n");
    const parsed = validateNote("water the fern.md", text, taskFrontmatter);
    expect(parsed.errors).toBeNull();
    expect(parsed.data?.["alert weight"]).toBe("quiet");
  });

  it("names every value it reads through a fallback", () => {
    expect(taskWarnings({ "alert weight": "loud" })).toEqual([
      'alert weight "loud" is not harsh or quiet, so it rings harsh',
    ]);
    expect(taskWarnings({ "alert weight": "Quiet" })).toEqual([
      'alert weight "Quiet" is not harsh or quiet, so it rings harsh',
    ]);
    expect(taskWarnings({ "alert weight": 5 })).toEqual([
      "alert weight 5 is not harsh or quiet, so it rings harsh",
    ]);
    expect(taskWarnings({ "alert weight": "" })).toEqual([
      'alert weight "" is not harsh or quiet, so it rings harsh',
    ]);
  });

  it("warns for no value it reads directly", () => {
    expect(taskWarnings({})).toEqual([]);
    expect(taskWarnings({ "alert weight": null })).toEqual([]);
    expect(taskWarnings({ "alert weight": "harsh" })).toEqual([]);
    expect(taskWarnings({ "alert weight": "quiet" })).toEqual([]);
  });
});

describe("taskIsDone", () => {
  it("derives done from the completed date", () => {
    const open = taskFrontmatter.parse({ kind: "[[tasks]]", created: "2026-10-19" });
    const done = taskFrontmatter.parse({
      kind: "[[tasks]]",
      created: "2026-10-19",
      completed: "2026-10-20",
    });
    expect(taskIsDone(open)).toBe(false);
    expect(taskIsDone(done)).toBe(true);
  });
});

describe("taskWarnings on a done mismatch", () => {
  const minimal = { kind: "[[tasks]]", created: "2026-10-19" };

  it("warns nothing when status done has a completed date", () => {
    const result = taskFrontmatter.safeParse({
      ...minimal,
      status: "[[done]]",
      completed: "2026-10-20",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(taskWarnings(result.data)).toEqual([]);
    }
  });

  it("warns when status done has no completed date", () => {
    const result = taskFrontmatter.safeParse({ ...minimal, status: "[[done]]" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(taskWarnings(result.data)).toEqual([
        "status [[done]] has no completed date",
      ]);
    }
  });

  it("warns when a completed date meets another status", () => {
    const result = taskFrontmatter.safeParse({
      ...minimal,
      status: "[[active]]",
      completed: "2026-10-20",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(taskWarnings(result.data)).toEqual([
        "completed date with status [[active]] is not done",
      ]);
    }
  });

  it("reads a bare status from a note's text", () => {
    const parsed = validateNote(
      "build dashboard.md",
      note('kind: "[[deeds]]"', "status: done"),
      taskFrontmatter,
    );
    expect(parsed.errors).toBeNull();
    expect(taskWarnings(parsed.note.values)).toEqual([
      "status [[done]] has no completed date",
    ]);
  });

  it("keeps the note valid and not done on a mismatch", () => {
    const task = taskFrontmatter.parse({ ...minimal, status: "[[done]]" });
    expect(taskIsDone(task)).toBe(false);
  });
});

describe("deed notes read as tasks", () => {
  it("reads a deed stored today as a task with its status", () => {
    const parsed = validateNote(
      "audit journal contents.md",
      note(
        'kind: "[[deeds]]"',
        'parent deed: "[[consolidate-old-journal-entries]]"',
        'status: "[[backlog]]"',
        "created: 2026-09-12",
      ),
      taskFrontmatter,
    );
    expect(parsed.errors).toBeNull();
    expect(parsed.data?.kind).toBe("[[tasks]]");
    expect(parsed.data?.status).toBe("[[backlog]]");
    expect(parsed.data?.["parent deed"]).toBe("[[consolidate-old-journal-entries]]");
  });

  it("reads a bare kind as the task kind", () => {
    const parsed = validateNote(
      "brainstorm.md",
      note("kind: deeds", 'status: "[[someday]]"'),
      taskFrontmatter,
    );
    expect(parsed.errors).toBeNull();
    expect(parsed.data?.kind).toBe("[[tasks]]");
    expect(parsed.data?.status).toBe("[[someday]]");
  });

  it("reads a bare status value and wraps it", () => {
    const parsed = validateNote(
      "build dashboard.md",
      note('kind: "[[deeds]]"', "status: backlog", "created: 2026-09-12"),
      taskFrontmatter,
    );
    expect(parsed.errors).toBeNull();
    expect(parsed.data?.status).toBe("[[backlog]]");
  });

  it("reads a deed with no status as a task with none", () => {
    const parsed = validateNote(
      "brainstorm.md",
      note('kind: "[[deeds]]"', 'parent deed: "[[tower-defence-game]]"'),
      taskFrontmatter,
    );
    expect(parsed.errors).toBeNull();
    expect(parsed.data?.status).toBeUndefined();
    expect(parsed.data?.["parent deed"]).toBe("[[tower-defence-game]]");
  });

  it("accepts a deed with no created date", () => {
    const parsed = validateNote(
      "build a trading agent workflow and app.md",
      note('kind: "[[deeds]]"', 'status: "[[backlog]]"'),
      taskFrontmatter,
    );
    expect(parsed.errors).toBeNull();
  });

  it("keeps categories, types and after untouched", () => {
    const parsed = validateNote(
      "build a trading agent workflow and app.md",
      note(
        'kind: "[[deeds]]"',
        "categories:",
        '  - "[[Waypoints/digital|digital]]"',
        "types:",
        '  - "[[apps]]"',
        'status: "[[backlog]]"',
        'after: "[[create a recurring checklist template]]"',
      ),
      taskFrontmatter,
    );
    expect(parsed.errors).toBeNull();
    expect(parsed.data?.categories).toEqual(["[[Waypoints/digital|digital]]"]);
    expect(parsed.data?.types).toEqual(["[[apps]]"]);
    expect(parsed.data?.after).toEqual([
      "[[create a recurring checklist template]]",
    ]);
    expect(parsed.data?.["blocked by"]).toBeUndefined();
  });

  it("reads after alone with an empty blocked by", () => {
    const parsed = validateNote(
      "brainstorm.md",
      note('kind: "[[deeds]]"', "after:", "created: 2026-09-12"),
      taskFrontmatter,
    );
    expect(parsed.errors).toBeNull();
    expect(parsed.data?.after).toBeNull();
    expect(parsed.data?.["blocked by"]).toBeUndefined();
  });

  it("reads blocked by from two links", () => {
    const parsed = validateNote(
      "china proof tunnel.md",
      note(
        'kind: "[[deeds]]"',
        'status: "[[active]]"',
        "created: 2026-02-03",
        "blocked by:",
        '  - "[[finish the tunnel research]]"',
        '  - "[[pick a provider]]"',
      ),
      taskFrontmatter,
    );
    expect(parsed.errors).toBeNull();
    expect(parsed.data?.["blocked by"]).toEqual([
      "[[finish the tunnel research]]",
      "[[pick a provider]]",
    ]);
  });

  it("rejects a deed with a broken after", () => {
    const parsed = validateNote(
      "broken.md",
      note('kind: "[[deeds]]"', 'after: "[[]]"'),
      taskFrontmatter,
    );
    expect(parsed.errors).not.toBeNull();
  });

  it("still needs a created date on a task note", () => {
    const parsed = validateNote(
      "stray.md",
      note('kind: "[[tasks]]"'),
      taskFrontmatter,
    );
    expect(parsed.errors).not.toBeNull();
  });

  it("rejects the list kind", () => {
    const parsed = validateNote(
      "groceries.md",
      note('kind: "[[lists]]"', "created: 2026-10-19"),
      taskFrontmatter,
    );
    expect(parsed.errors).not.toBeNull();
  });
});

describe("listFrontmatter", () => {
  it("accepts a minimal list note", () => {
    const result = listFrontmatter.safeParse({
      kind: "[[lists]]",
      created: "2026-10-19",
    });
    expect(result.success).toBe(true);
  });

  it("reads a bare kind and returns the link form", () => {
    const result = listFrontmatter.safeParse({
      kind: "lists",
      created: "2026-10-19",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kind).toBe("[[lists]]");
    }
  });

  it("reads the link kind unchanged", () => {
    const result = listFrontmatter.safeParse({
      kind: "[[lists]]",
      created: "2026-10-19",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kind).toBe("[[lists]]");
    }
  });

  it("rejects another kind in either shape", () => {
    for (const kind of ["tasks", "[[tasks]]", "deeds", "[[list]]", ""]) {
      const result = listFrontmatter.safeParse({ kind, created: "2026-10-19" });
      expect(result.success).toBe(false);
    }
  });
});

describe("parseFrontmatter", () => {
  it("parses a real deed note", () => {
    const text = [
      "---",
      'kind: "[[deeds]]"',
      'status: "[[backlog]]"',
      "created: 2026-09-07",
      "categories:",
      '  - "[[digital]]"',
      "after:",
      "---",
      "",
      "## Context",
      "",
      "- Switch back to Floorp",
      "",
    ].join("\n");
    const parsed = parseFrontmatter("deed browser set up.md", text);
    expect(parsed.title).toBe("deed browser set up");
    expect(parsed.values.kind).toBe("[[deeds]]");
    expect(parsed.values.categories).toEqual(["[[digital]]"]);
    expect(parsed.values.after).toBeNull();
    expect(parsed.body).toContain("## Context");
  });

  it("keeps unknown rich values as raw strings", () => {
    const text = [
      "---",
      "kind: \"[[tasks]]\"",
      "created: 2026-10-19",
      "tags:",
      "  - kind",
      "---",
      "body",
    ].join("\n");
    const parsed = parseFrontmatter("x.md", text);
    expect(parsed.values.tags).toEqual(["kind"]);
  });

  it("returns the body when frontmatter is missing", () => {
    const parsed = parseFrontmatter("note.md", "just text");
    expect(parsed.values).toEqual({});
    expect(parsed.body).toBe("just text");
    expect(parsed.title).toBe("note");
  });
});

describe("validateNote", () => {
  it("reads a bare kind from a note's text as the link form", () => {
    const bare = validateNote(
      "call the dentist.md",
      "---\nkind: tasks\ncreated: 2026-10-19\n---\n",
      taskFrontmatter,
    );
    expect(bare.errors).toBeNull();
    expect(bare.data?.kind).toBe("[[tasks]]");
  });

  it("resolves a legacy lists through a note's text", () => {
    const text = [
      "---",
      'kind: "[[tasks]]"',
      "created: 2026-10-19",
      "lists:",
      '  - "[[Focus]]"',
      '  - "[[Home]]"',
      "---",
      "",
    ].join("\n");
    const parsed = validateNote("water plants.md", text, taskFrontmatter);
    expect(parsed.errors).toBeNull();
    expect(parsed.data?.list).toBe("[[Focus]]");
    expect(parsed.data).not.toHaveProperty("lists");
  });

  it("returns data on a valid note and errors on an invalid one", () => {
    const good = validateNote(
      "call the dentist.md",
      '---\nkind: "[[tasks]]"\ncreated: 2026-10-19\ndue: 2026-10-21\n---\n',
      taskFrontmatter,
    );
    expect(good.data?.due).toBe("2026-10-21");
    expect(good.errors).toBeNull();

    const bad = validateNote(
      "broken.md",
      '---\nkind: "[[tasks]]"\ncreated: nope\n---\n',
      taskFrontmatter,
    );
    expect(bad.data).toBeNull();
    expect(bad.errors).not.toBeNull();
    expect(bad.note.title).toBe("broken");
  });
});

describe("wikilinkTarget", () => {
  it("extracts the target", () => {
    expect(wikilinkTarget("[[groceries]]")).toBe("groceries");
  });
});

describe("agentFrontmatter", () => {
  it("reads an agent note as an agent writes it", () => {
    const result = validateNote(
      "mstack-handover.md",
      note(
        'kind: "[[agents]]"',
        "created: 2026-11-26T09:30",
        "categories:",
        '  - "[[life engineering systems]]"',
        "types:",
        '  - "[[handovers]]"',
        "tags:",
        "  - mstack",
        "  - handover",
      ),
      agentFrontmatter,
    );
    expect(result.errors).toBeNull();
    expect(result.data).toMatchObject({
      kind: "[[agents]]",
      created: "2026-11-26T09:30",
      categories: ["[[life engineering systems]]"],
      types: ["[[handovers]]"],
      tags: ["mstack", "handover"],
    });
  });

  it("reads a bare kind and a date-only created", () => {
    const result = agentFrontmatter.safeParse({
      kind: "agents",
      created: "2026-11-26",
      categories: ["[[physical]]"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kind).toBe("[[agents]]");
    }
  });

  it("reads a single category as a one-item list", () => {
    const result = agentFrontmatter.safeParse({
      kind: "[[agents]]",
      created: "2026-11-26",
      categories: "[[physical]]",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.categories).toEqual(["[[physical]]"]);
    }
  });

  it("keeps properties it does not know", () => {
    const result = agentFrontmatter.safeParse({
      kind: "[[agents]]",
      created: "2026-11-26",
      categories: ["[[physical]]"],
      banner: "x.png",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.banner).toBe("x.png");
    }
  });

  it("rejects a note without categories", () => {
    for (const categories of [undefined, null, []]) {
      const result = agentFrontmatter.safeParse({
        kind: "[[agents]]",
        created: "2026-11-26",
        categories,
      });
      expect(result.success).toBe(false);
    }
  });

  it("rejects a note without a created date", () => {
    for (const created of [undefined, null, "26 Nov 2026"]) {
      const result = agentFrontmatter.safeParse({
        kind: "[[agents]]",
        created,
        categories: ["[[physical]]"],
      });
      expect(result.success).toBe(false);
    }
  });

  it("rejects the operator's notes kind and every other kind", () => {
    for (const kind of ["notes", "[[notes]]", "[[tasks]]", "[[agent]]", ""]) {
      const result = agentFrontmatter.safeParse({
        kind,
        created: "2026-11-26",
        categories: ["[[physical]]"],
      });
      expect(result.success).toBe(false);
    }
  });
});

describe("journalFileName", () => {
  it("accepts a real date", () => {
    for (const name of ["2026-11-26.md", "2024-02-29.md", "2023-08-08.md"]) {
      expect(journalFileName.safeParse(name).success).toBe(true);
    }
  });

  it("rejects a date that is not on the calendar", () => {
    for (const name of ["2025-02-29.md", "2026-13-01.md", "2026-04-31.md", "2026-00-10.md"]) {
      expect(journalFileName.safeParse(name).success).toBe(false);
    }
  });

  it("rejects any other name", () => {
    for (const name of ["AGENTS.md", "2026-11-26", "2026-11-26.txt", "2026-1-26.md", "Daily/2026-11-26.md"]) {
      expect(journalFileName.safeParse(name).success).toBe(false);
    }
  });
});
