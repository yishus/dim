import { TokenCostHelper } from "../token-cost";
import type { ModelId } from "../types";
import type { EventBus } from "./event-bus";

export class CostTracker {
  private totalCost = 0;

  constructor(private eventBus: EventBus) {}

  trackUsage(
    inputTokens: number,
    outputTokens: number,
    model: ModelId,
    cacheCreationInputTokens?: number,
    cacheReadInputTokens?: number,
  ): void {
    const streamCost = TokenCostHelper.calculateCost(
      inputTokens,
      outputTokens,
      model,
      cacheCreationInputTokens,
      cacheReadInputTokens,
    ).totalCost;
    this.totalCost += streamCost;
    this.eventBus.emit("token_usage_update", {
      cost: this.totalCost,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    });
  }

  getTotalCost(): number {
    return this.totalCost;
  }
}
