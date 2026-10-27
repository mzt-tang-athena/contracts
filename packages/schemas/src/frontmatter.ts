/**
 * A small YAML-frontmatter parser, good enough for the vault's
 * vocabulary. Frontmatter is flat: each key holds a scalar (bare,
 * double-quoted or single-quoted), nothing, or a block list whose
 * items sit at any indent. Anything richer is left to the client: a
 * flow value such as `[a, b]` reads as its raw text, and a nested key
 * leaves its parent empty.
 */

export type ParsedNote = {
  /** Raw frontmatter values, strings as written; empty properties are null. */
  values: Record<string, string | string[] | null>;
  /** The note body below the frontmatter block. */
  body: string;
  /** The file name without extension, the note's title. */
  title: string;
};

export function parseFrontmatter(fileName: string, text: string): ParsedNote {
  const values: Record<string, string | string[] | null> = {};
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!match) {
    return { values, body: text, title: stripExtension(fileName) };
  }
  let currentKey: string | null = null;
  for (const line of match[1].split(/\r?\n/)) {
    const listItem = /^[ \t]*- ([\s\S]*)$/.exec(line);
    if (listItem) {
      // An item belongs to the key above it only when that key has no
      // value on its own line or already holds a list.
      const existing = currentKey == null ? undefined : values[currentKey];
      if (
        currentKey != null &&
        (existing === null || Array.isArray(existing))
      ) {
        values[currentKey] = [...(existing ?? []), scalar(listItem[1])];
      }
      continue;
    }
    const pair = /^([^:\s][^:]*):([\s\S]*)$/.exec(line);
    if (pair) {
      currentKey = pair[1].trim();
      const raw = trimSpaces(pair[2]);
      values[currentKey] = raw === "" ? null : scalar(raw);
      continue;
    }
    // An indented line before any item is a nested key, which this
    // parser does not read. The items under it are not the parent's.
    if (
      currentKey != null &&
      values[currentKey] === null &&
      /^[ \t]+[^\s#-]/.test(line)
    ) {
      currentKey = null;
    }
  }
  return {
    values,
    body: text.slice(match[0].length),
    title: stripExtension(fileName),
  };
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}

/**
 * A scalar as YAML reads it. Quotes come off only when both ends hold
 * the same quote; a value with a quote at one end only stays as
 * written.
 */
function scalar(raw: string): string {
  const value = trimSpaces(raw);
  const quote = value[0];
  if (
    value.length >= 2 &&
    (quote === '"' || quote === "'") &&
    value.endsWith(quote)
  ) {
    const inner = value.slice(1, -1);
    return quote === '"' ? decodeEscapes(inner) : inner.replace(/''/g, "'");
  }
  return value;
}

/**
 * Strip the spaces and tabs at both ends. YAML strips only those two,
 * so a no-break space stays part of the value.
 */
function trimSpaces(value: string): string {
  return value.replace(/^[ \t]+|[ \t]+$/g, "");
}

/** YAML's one-character escapes in a double-quoted scalar. */
const ESCAPES: Record<string, string> = {
  "0": "\0",
  a: "\x07",
  b: "\b",
  t: "\t",
  "\t": "\t",
  n: "\n",
  v: "\v",
  f: "\f",
  r: "\r",
  e: "\x1b",
  " ": " ",
  '"': '"',
  "/": "/",
  "\\": "\\",
  N: "\u0085",
  _: "\u00a0",
  L: "\u2028",
  P: "\u2029",
};

/**
 * Decode the escapes in a double-quoted scalar. An escape YAML does not
 * know stays as written, so a hand-typed path such as `C:\Users` keeps
 * its backslash instead of failing the note.
 */
function decodeEscapes(inner: string): string {
  return inner.replace(
    /\\(x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8}|[\s\S])/g,
    (escape, code: string) => {
      if (code.length > 1) {
        const point = Number.parseInt(code.slice(1), 16);
        return point <= 0x10ffff ? String.fromCodePoint(point) : escape;
      }
      return ESCAPES[code] ?? escape;
    },
  );
}
