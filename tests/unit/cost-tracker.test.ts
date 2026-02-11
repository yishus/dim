import { describe, expect, test } from "bun:test";
import { CostTracker } from "../../src/services/cost-tracker";
import { EventBus } from "../../src/services/event-bus";

describe("CostTracker", () => {
  test("tracks cumulative cost and emits token_usage_update", () => {
    const eventBus = new EventBus();
    const tracker = new CostTracker(eventBus);

    const emitted: unknown[] = [];
    eventBus.on("token_usage_update", (event) => emitted.push(event));

    tracker.trackUsage(1_000_000, 1_000_000, "claude-sonnet-4-5-20250929");

    expect(tracker.getTotalCost()).toBe(18.0);
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toEqual({
      cost: 18.0,
      input_tokens: 1_000_000,
      output_tokens: 1_000_000,
    });
  });

  test("accumulates cost across multiple calls", () => {
    const eventBus = new EventBus();
    const tracker = new CostTracker(eventBus);

    tracker.trackUsage(1_000_000, 1_000_000, "claude-sonnet-4-5-20250929");
    tracker.trackUsage(1_000_000, 1_000_000, "claude-sonnet-4-5-20250929");

    expect(tracker.getTotalCost()).toBe(36.0);
  });

  test("handles unknown models with zero cost", () => {
    const eventBus = new EventBus();
    const tracker = new CostTracker(eventBus);

    tracker.trackUsage(1_000_000, 1_000_000, "unknown-model" as any);

    expect(tracker.getTotalCost()).toBe(0);
  });
});
