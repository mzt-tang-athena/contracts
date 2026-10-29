import { z } from "zod";
import { browserAction, runAction, runOutcome, runStats } from "./action.js";

/**
 * One event on a run's stream. Every event carries the same envelope:
 * schema version, event id, run id, the run-local sequence number, and a
 * timestamp. A consumer that only reads `type` and `data` is future proof.
 *
 * The stream starts with `run.started` and ends with `run.finished`.
 */
const envelope = {
  v: z.literal(1),
  id: z.string(),
  runId: z.string(),
  seq: z.number().int().positive(),
  ts: z.string(),
};

/** The run opened a browser and began. */
export const runStarted = z.object({
  ...envelope,
  type: z.literal("run.started"),
  data: z.object({
    goal: z.string(),
    url: z.string().nullable(),
    profile: z.string().nullable(),
    allowlist: z.array(z.string()),
  }),
});

/** One logged step: a browser action, a field fill, a verify, a refusal, or an idle answer. */
export const step = z.object({
  ...envelope,
  type: z.literal("step"),
  data: z.object({
    seq: z.number().int().positive(),
    step: z.number().int().nonnegative(),
    kind: z.enum(["action", "verify", "idle", "field", "guard", "gate"]),
    source: z.string(),
    probability: z.number().min(0).max(1).nullable(),
    action: runAction.nullable(),
    text: z.string(),
    result: z.string(),
    url: z.string(),
    ms: z.number().nonnegative(),
    costUsd: z.number().nonnegative().nullable(),
  }),
});

/** The compact record of what was chosen in a step and why. */
export const decision = z.object({
  ...envelope,
  type: z.literal("decision"),
  data: z.object({
    step: z.number().int().nonnegative(),
    by: z.string(),
    kind: z.enum(["action", "verify", "idle", "field", "guard", "gate"]),
    action: runAction.nullable(),
    probability: z.number().min(0).max(1).nullable(),
    reason: z.string(),
  }),
});

/** A run is waiting for a human to approve an irreversible action. */
export const approvalNeeded = z.object({
  ...envelope,
  type: z.literal("approval.needed"),
  data: z.object({
    action: browserAction,
    question: z.string(),
    probability: z.number().min(0).max(1),
    url: z.string(),
    timeoutMs: z.number().int().positive(),
  }),
});

/** The run ended. This is always the last event on the stream. */
export const runFinished = z.object({
  ...envelope,
  type: z.literal("run.finished"),
  data: z.object({
    outcome: runOutcome,
    reason: z.string().nullable(),
    stats: runStats,
  }),
});

export const runEvent = z.discriminatedUnion("type", [runStarted, step, decision, approvalNeeded, runFinished]);

export type RunEvent = z.output<typeof runEvent>;
export type RunStartedEvent = z.output<typeof runStarted>;
export type StepEvent = z.output<typeof step>;
export type DecisionEvent = z.output<typeof decision>;
export type ApprovalNeededEvent = z.output<typeof approvalNeeded>;
export type RunFinishedEvent = z.output<typeof runFinished>;
