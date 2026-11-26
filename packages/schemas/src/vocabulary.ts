import { z } from "zod";

/**
 * The vault vocabulary, as frontmatter values.
 *
 * Notes store wikilink-valued properties in their quoted form, for
 * example `status: "[[active]]"`. Dates are `YYYY-MM-DD`; datetimes are
 * `YYYY-MM-DDTHH:MM`, seconds optional. A `kind` reads as a bare value
 * or as its link form, and parses to a link. A task note parses the
 * deed kind as the task kind, so clients see one kind for work.
 * Everything unknown is preserved, never rejected, so notes keep
 * whatever frontmatter Obsidian plugins add.
 */

/** A wikilink-valued frontmatter value, for example "[[digital]]". */
export const wikilink = z.preprocess(
  (raw) => {
    if (typeof raw !== "string") {
      return raw;
    }
    const value = raw.trim();
    return /^\[\[[^\]]+\]\]$/.test(value) ? value : `[[${value}]]`;
  },
  z.string().regex(/^\[\[[^\]]+\]\]$/, "expected a wikilink like \"[[name]]\""),
);
export type Wikilink = z.infer<typeof wikilink>;

/** The target inside a wikilink: "[[digital]]" -> "digital". */
export function wikilinkTarget(link: Wikilink): string {
  return link.slice(2, -2);
}

/** Date only: YYYY-MM-DD. */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected a date like 2026-10-21");
export type IsoDate = z.infer<typeof isoDate>;

/** Date or datetime: YYYY-MM-DD or YYYY-MM-DDTHH:MM(:SS). */
export const dateOrDatetime = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/,
    "expected a date like 2026-10-21 or a datetime like 2026-10-21T15:00",
  );
export type DateOrDatetime = z.infer<typeof dateOrDatetime>;

/** Datetime: YYYY-MM-DDTHH:MM(:SS). */
export const isoDatetime = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/,
    "expected a datetime like 2026-10-21T15:00",
  );
export type IsoDatetime = z.infer<typeof isoDatetime>;

/**
 * An iCalendar recurrence rule (RFC 5545 RRULE), for example
 * "FREQ=MONTHLY". Stored as one string; parsed with rrule.js by
 * clients, never here.
 */
export const recurrenceRule = z
  .string()
  .min(1)
  .regex(/^[A-Z]+=/, "expected an RRULE like FREQ=MONTHLY");
export type RecurrenceRule = z.infer<typeof recurrenceRule>;

/**
 * How hard a task's alerts ring. `harsh` is a need: it rings and is
 * hard to miss. `quiet` is a cue: it is silent and easy to clear.
 */
export const alertWeights = ["harsh", "quiet"] as const;
export type AlertWeight = (typeof alertWeights)[number];

/**
 * Task status. A task with a status is a deed. Canonical storage is
 * the quoted wikilink form. Bare values ("backlog") exist in older
 * notes and are wrapped; the app's write path canonicalizes them.
 */
const statusValues = ["backlog", "active", "done", "dropped", "someday"] as const;

export const taskStatus = z.preprocess(
  (raw) =>
    typeof raw === "string" && (statusValues as readonly string[]).includes(raw)
      ? `[[${raw}]]`
      : raw,
  z.enum(["[[backlog]]", "[[active]]", "[[done]]", "[[dropped]]", "[[someday]]"]).nullish(),
);
export type TaskStatus = NonNullable<z.infer<typeof taskStatus>>;

const optionalList = <T extends z.ZodTypeAny>(value: T) =>
  // Single values exist in the vault; normalize them into one-item lists.
  z.preprocess(
    (raw) => (raw == null || Array.isArray(raw) ? raw : [raw]),
    z.array(value).nullish(),
  ); // empty properties arrive as null

/**
 * Frontmatter of a task note, per ticket 0004 and ADR
 * 20261124-deeds-are-tasks-with-a-status. A deed note reads here too:
 * its kind parses to `"[[tasks]]"`, and it may lack `created`.
 * `parent deed`, `categories` and `types` are not task fields, so the
 * loose object keeps them untouched. `after` is validated, kept in the
 * output, and never read as `blocked by`, because most of its links mean
 * order.
 */
const taskFields = z
  .object({
    kind: wikilink.pipe(z.enum(["[[tasks]]", "[[deeds]]"])),
    title: z.string().min(1).nullish(),
    /** Manual position inside its tab; missing sorts after ordered. */
    order: z.coerce.number().int().nullish(),
    /** New notes carry the minute; older ones hold the date alone. */
    created: dateOrDatetime.nullish(),
    /** New notes carry the minute; older ones hold the date alone. */
    completed: dateOrDatetime.nullish(),
    due: dateOrDatetime.nullish(),
    reminders: optionalList(isoDatetime),
    recurrence: recurrenceRule.nullish(),
    "recurrence previous": wikilink.nullish(),
    /**
     * How hard this task's alerts ring. An absent or empty value reads
     * `harsh` with no warning. An unreadable value also reads `harsh`,
     * and `taskWarnings` names it. A typo never silences an alert.
     */
    "alert weight": z.enum(alertWeights).default("harsh").catch("harsh"),
    /** The one list this task belongs to; absent means Main. */
    list: wikilink.nullish(),
    /** Legacy. Validated so broken notes still fail, then dropped. */
    lists: optionalList(wikilink),
    /** A task with a status is a deed; absent means a plain task. */
    status: taskStatus,
    /** Each linked note must finish before this task can start. */
    "blocked by": optionalList(wikilink),
    /** Legacy order links, read as a list and kept in the output. */
    after: optionalList(wikilink),
  })
  .loose();

export const taskFrontmatter = taskFields
  .superRefine((values, ctx) => {
    if (values.kind === "[[tasks]]" && values.created == null) {
      ctx.addIssue({
        code: "custom",
        path: ["created"],
        message: "a task note needs a created date",
      });
    }
  })
  .transform((values): z.output<typeof taskFields> & { kind: "[[tasks]]" } => {
    const { lists, ...rest } = values;
    const inherited = lists?.[0];
    const next =
      rest.list === undefined && inherited !== undefined
        ? { ...rest, list: inherited }
        : rest;
    return { ...next, kind: "[[tasks]]" };
  });
export type TaskFrontmatter = z.infer<typeof taskFrontmatter>;

function rawStatus(raw: unknown): TaskStatus | null {
  const parsed = taskStatus.safeParse(raw);
  return parsed.success ? (parsed.data ?? null) : null;
}

/** One task warning, named by the property that raised it. */
export type TaskWarning = {
  field: string;
  message: string;
};

/**
 * One warning per task frontmatter value the schema reads through a
 * fallback, or that disagrees with another. A warning means the note is
 * valid and its row stays; it says which value was replaced or what
 * disagrees.
 */
export function taskWarningDetails(
  values: Record<string, unknown>,
): TaskWarning[] {
  const warnings: TaskWarning[] = [];
  const weight = values["alert weight"];
  if (weight != null && !alertWeights.some((value) => value === weight)) {
    warnings.push({
      field: "alert weight",
      message: `alert weight ${JSON.stringify(weight)} is not harsh or quiet, so it rings harsh`,
    });
  }
  const status = rawStatus(values.status);
  const completed = values.completed;
  if (status === "[[done]]" && completed == null) {
    warnings.push({
      field: "status",
      message: "status [[done]] has no completed date",
    });
  }
  if (status != null && status !== "[[done]]" && completed != null) {
    warnings.push({
      field: "completed",
      message: `completed date with status ${status} is not done`,
    });
  }
  return warnings;
}

/** The same warnings as plain messages, for clients that only print them. */
export function taskWarnings(values: Record<string, unknown>): string[] {
  return taskWarningDetails(values).map((warning) => warning.message);
}

/** Frontmatter of a list note, per ticket 0004. */
export const listFrontmatter = z
  .object({
    kind: wikilink.pipe(z.literal("[[lists]]")),
    created: isoDate,
  })
  .loose();
export type ListFrontmatter = z.infer<typeof listFrontmatter>;

/** A task is done exactly when its completed date is present. */
export function taskIsDone(task: TaskFrontmatter): boolean {
  return task.completed != null && task.completed !== "";
}

/**
 * Frontmatter of an agent note in `Agents/`, per ADR
 * 20261126-vault-writing-standards. `types` links must resolve to an
 * existing note; the vault checker enforces that, not this schema.
 */
export const agentFrontmatter = z
  .object({
    kind: wikilink.pipe(z.literal("[[agents]]")),
    created: dateOrDatetime,
    categories: z.preprocess(
      (raw) => (raw == null || Array.isArray(raw) ? raw : [raw]),
      z.array(wikilink).min(1, "an agent note needs at least one category"),
    ),
    types: optionalList(wikilink),
    tags: optionalList(z.string()),
  })
  .loose();
export type AgentFrontmatter = z.infer<typeof agentFrontmatter>;

/**
 * The fields the three kinds the operator writes share, per ADR
 * 20261126-vault-writing-standards and its 2026-11-26 amendment. Only
 * `kind` is required on those notes, so `created` is optional here.
 */
const operatorFields = {
  created: dateOrDatetime.nullish(),
  categories: optionalList(wikilink),
  types: optionalList(wikilink),
  related: optionalList(wikilink),
};

/** Frontmatter of the operator's own thinking, `kind: "[[notes]]"`. */
export const noteFrontmatter = z
  .object({
    kind: wikilink.pipe(z.literal("[[notes]]")),
    ...operatorFields,
  })
  .loose();
export type NoteFrontmatter = z.infer<typeof noteFrontmatter>;

/** Frontmatter of a reference note, `kind: "[[references]]"`. */
export const referenceFrontmatter = z
  .object({
    kind: wikilink.pipe(z.literal("[[references]]")),
    ...operatorFields,
  })
  .loose();
export type ReferenceFrontmatter = z.infer<typeof referenceFrontmatter>;

/** Frontmatter of a waypoint note, `kind: "[[waypoints]]"`. */
export const waypointFrontmatter = z
  .object({
    kind: wikilink.pipe(z.literal("[[waypoints]]")),
    ...operatorFields,
    cover: wikilink.nullish(),
  })
  .loose();
export type WaypointFrontmatter = z.infer<typeof waypointFrontmatter>;

function isCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * The file name of a daily journal note in `Journal/Daily/`: a real
 * local date, `YYYY-MM-DD.md`. The body grammar belongs to monkey-tasks
 * ADR 20261112-journal-format; no frontmatter is required.
 */
export const journalFileName = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}\.md$/, "expected a journal file name like 2026-11-26.md")
  .refine((name) => {
    const [year, month, day] = name.slice(0, 10).split("-").map(Number);
    return isCalendarDate(year, month, day);
  }, "expected a real calendar date");
