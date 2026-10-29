import { z } from "zod";

/**
 * The actions the browser can run. Run-ending kinds never reach it.
 * A ref is a Playwright aria ref from the page snapshot, for example "e4".
 */
export const browserAction = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("click"), ref: z.string(), role: z.string().optional(), label: z.string() }),
  z.object({ kind: z.literal("type"), ref: z.string(), text: z.string(), label: z.string() }),
  z.object({ kind: z.literal("select"), ref: z.string(), option: z.string(), label: z.string() }),
  z.object({ kind: z.literal("goto"), url: z.string(), label: z.string() }),
  z.object({ kind: z.literal("scroll"), direction: z.enum(["up", "down"]), label: z.string() }),
  z.object({ kind: z.literal("wait"), label: z.string() }),
]);

/** The actions that end a run instead of touching the browser. */
export const runEnd = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("done"), reason: z.string() }),
  z.object({ kind: z.literal("blocked"), reason: z.string() }),
  z.object({ kind: z.literal("human-input"), ask: z.string() }),
]);

/** Every action a run can log: a browser action or a run end. */
export const runAction = z.union([browserAction, runEnd]);

export type BrowserAction = z.output<typeof browserAction>;
export type RunEnd = z.output<typeof runEnd>;
export type RunAction = z.output<typeof runAction>;

/** How a run ends. */
export const runOutcome = z.enum(["done", "blocked", "needs-human-input", "paused", "max-steps", "error"]);

/** Where a run is now: running, waiting for a human, or one of the outcomes. */
export const runStatus = z.enum(["running", "waiting-approval", "done", "blocked", "needs-human-input", "paused", "max-steps", "error"]);

/** Model calls, time, tokens, and known cost for one run. */
export const runStats = z.object({
  reflex: z.object({
    calls: z.number().int().nonnegative(),
    ms: z.number().nonnegative(),
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    costUsd: z.number().nonnegative().nullable(),
  }),
  planner: z.object({
    calls: z.number().int().nonnegative(),
    ms: z.number().nonnegative(),
    costUsd: z.number().nonnegative(),
  }),
});

export type RunOutcome = z.output<typeof runOutcome>;
export type RunStatus = z.output<typeof runStatus>;
export type RunStats = z.output<typeof runStats>;
