import { describe, expect, it } from "vitest";
import { approvalNeeded, browserAction, runEvent, runOutcome, runStats, step } from "../src/index.js";

const envelope = { v: 1, id: "run_1.1", runId: "run_1", seq: 1, ts: "2026-10-29T00:00:00.000Z" };

const stats = {
  reflex: { calls: 1, ms: 40, inputTokens: 10, outputTokens: 2, costUsd: 0.0001 },
  planner: { calls: 0, ms: 0, costUsd: 0 },
};

const samples = [
  { ...envelope, type: "run.started", data: { goal: "Order a latte", url: "https://example.test/", profile: null, allowlist: ["example.test"] } },
  {
    ...envelope,
    type: "step",
    data: { seq: 1, step: 1, kind: "action", source: "systemone", probability: 0.92, action: { kind: "click", ref: "e4", label: 'click button "Order latte"' }, text: "click", result: "page changed", url: "https://example.test/", ms: 40, costUsd: 0.0001 },
  },
  {
    ...envelope,
    type: "decision",
    data: { step: 1, by: "systemone", kind: "action", action: { kind: "click", ref: "e4", label: "click" }, probability: 0.92, reason: "page changed" },
  },
  {
    ...envelope,
    type: "approval.needed",
    data: { action: { kind: "click", ref: "e5", label: 'click button "Place order"' }, question: "Approve this action?", probability: 0.9, url: "https://example.test/", timeoutMs: 300000 },
  },
  { ...envelope, type: "run.finished", data: { outcome: "done", reason: "the goal is reached", stats } },
];

describe("runEvent", () => {
  it("accepts one sample of every event type", () => {
    for (const sample of samples) expect(runEvent.safeParse(sample).success).toBe(true);
  });

  it("keeps the type in step with the data", () => {
    const parsed = runEvent.parse(samples[4]);
    expect(parsed.type).toBe("run.finished");
    if (parsed.type === "run.finished") expect(parsed.data.stats.reflex.calls).toBe(1);
  });

  it("rejects an unknown event type", () => {
    expect(runEvent.safeParse({ ...envelope, type: "run.exploded", data: {} }).success).toBe(false);
  });

  it("rejects a probability outside 0 and 1", () => {
    const bad = { ...samples[1], data: { ...(samples[1] as { data: object }).data, probability: 1.5 } };
    expect(runEvent.safeParse(bad).success).toBe(false);
  });

  it("rejects an unknown action kind", () => {
    const bad = { ...samples[1], data: { ...(samples[1] as { data: object }).data, action: { kind: "fly", ref: "e1" } } };
    expect(runEvent.safeParse(bad).success).toBe(false);
  });
});

describe("the smaller schemas", () => {
  it("lists the six browser actions and the six outcomes", () => {
    expect(browserAction.options.map((option) => option.shape.kind.value)).toEqual(["click", "type", "select", "goto", "scroll", "wait"]);
    expect(runOutcome.options).toHaveLength(6);
  });

  it("requires a browser action for approval", () => {
    const bad = { ...samples[3], data: { ...(samples[3] as { data: object }).data, action: { kind: "done", reason: "x" } } };
    expect(approvalNeeded.safeParse(bad).success).toBe(false);
  });

  it("rejects a negative count in the stats", () => {
    expect(runStats.safeParse({ ...stats, planner: { calls: -1, ms: 0, costUsd: 0 } }).success).toBe(false);
  });

  it("rejects a step without a result", () => {
    const { result, ...rest } = (samples[1] as { data: Record<string, unknown> }).data;
    expect(result).toBeDefined();
    expect(step.safeParse({ ...samples[1], data: rest }).success).toBe(false);
  });
});
