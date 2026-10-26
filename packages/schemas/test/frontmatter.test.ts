import { describe, expect, it } from "vitest";
import { parseFrontmatter } from "../src/frontmatter.js";

/** The frontmatter values of a note whose block holds `lines`. */
function valuesOf(...lines: string[]) {
  return parseFrontmatter("note.md", `---\n${lines.join("\n")}\n---\n`).values;
}

describe("block list items", () => {
  it.each([
    ["no indent", ""],
    ["two spaces", "  "],
    ["four spaces", "    "],
    ["a tab", "\t"],
  ])("reads items at %s", (_label, indent) => {
    expect(valuesOf("lists:", `${indent}- "[[Focus]]"`).lists).toEqual([
      "[[Focus]]",
    ]);
  });

  it("reads every item in a list and moves on to the next key", () => {
    expect(
      valuesOf("lists:", '- "[[Focus]]"', '- "[[Home]]"', "due: 2026-10-21"),
    ).toEqual({ lists: ["[[Focus]]", "[[Home]]"], due: "2026-10-21" });
  });

  it("keeps the items around a blank line or a comment", () => {
    expect(
      valuesOf("lists:", "  - a", "", "  # b is gone", "  - c").lists,
    ).toEqual(["a", "c"]);
  });

  it("reads items under a key with only spaces after the colon", () => {
    expect(valuesOf("lists:   ", "  - a").lists).toEqual(["a"]);
  });

  it("reads items with Windows line endings", () => {
    const text = '---\r\nlists:\r\n    - "[[Focus]]"\r\n---\r\n';
    expect(parseFrontmatter("note.md", text).values.lists).toEqual([
      "[[Focus]]",
    ]);
  });

  it("leaves an item under a key that already holds a value", () => {
    expect(valuesOf("title: Call", "  - mum")).toEqual({ title: "Call" });
  });

  it("does not give a nested key's items to the key above it", () => {
    expect(valuesOf("plugin:", "  pins:", "    - a", "kind: x")).toEqual({
      plugin: null,
      kind: "x",
    });
  });

  it("leaves an item before the first key", () => {
    expect(valuesOf("- stray", "kind: x")).toEqual({ kind: "x" });
  });
});

describe("double-quoted values", () => {
  it.each([
    ["\\\\", "\\"],
    ['\\"', '"'],
    ["\\/", "/"],
    ["\\n", "\n"],
    ["\\r", "\r"],
    ["\\t", "\t"],
    ["\\u00e9", "\u00e9"],
    ["\\x41", "A"],
    ["\\U0001F600", "\u{1F600}"],
    ["\\uD83D\\uDE00", "\u{1F600}"],
    ["\\0", "\0"],
    ["\\a", "\x07"],
    ["\\b", "\b"],
    ["\\e", "\x1b"],
    ["\\f", "\f"],
    ["\\v", "\v"],
    ["\\ ", " "],
    ["\\N", "\u0085"],
    ["\\_", "\u00a0"],
    ["\\L", "\u2028"],
    ["\\P", "\u2029"],
  ])("decodes %s", (escape, decoded) => {
    expect(valuesOf(`title: "a${escape}b"`).title).toBe(`a${decoded}b`);
  });

  it("reads back a title the app quoted with JSON.stringify", () => {
    const title = '"Dune" by Herbert \\ part 1';
    expect(valuesOf(`title: ${JSON.stringify(title)}`).title).toBe(title);
  });

  it("decodes a quoted list item", () => {
    expect(valuesOf("lists:", '  - "[[a \\"b\\"]]"').lists).toEqual([
      '[[a "b"]]',
    ]);
  });

  it("keeps an escape YAML does not know as written", () => {
    expect(valuesOf('path: "C:\\Users\\x"').path).toBe("C:\\Users\\x");
  });

  it("reads an empty quoted value as empty text", () => {
    expect(valuesOf('title: ""').title).toBe("");
  });

  it("ignores spaces after the closing quote", () => {
    expect(valuesOf('kind: "[[tasks]]"  ').kind).toBe("[[tasks]]");
  });
});

describe("values with unusual characters", () => {
  it("reads a value and an item that hold a line separator", () => {
    expect(valuesOf("title: a\u2028b", "lists:", '  - "c\u2029d"')).toEqual({
      title: "a\u2028b",
      lists: ["c\u2029d"],
    });
  });

  it("keeps a no-break space at the ends of a bare value", () => {
    expect(valuesOf("title: \u00a0a\u00a0").title).toBe("\u00a0a\u00a0");
  });
});

describe("single-quoted values", () => {
  it("reads two single quotes as one", () => {
    expect(valuesOf("title: 'It''s done'").title).toBe("It's done");
  });

  it("keeps a backslash as written", () => {
    expect(valuesOf("title: 'a\\nb'").title).toBe("a\\nb");
  });
});

describe("a quote at one end only", () => {
  it.each([`"half'`, `'half"`, `"open`, `close"`, `'open`, `close'`, `"`])(
    "keeps %s as written",
    (value) => {
      expect(valuesOf(`title: ${value}`).title).toBe(value);
    },
  );
});
