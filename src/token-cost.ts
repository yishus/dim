interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  "claude-sonnet-4-6": {
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
  },
  "claude-opus-4-6": {
    inputPerMillion: 5.0,
    outputPerMillion: 25.0,
  },
  "claude-haiku-4-5-20251001": {
    inputPerMillion: 1.0,
    outputPerMillion: 5.0,
  },
  "gemini-3-flash-preview": {
    inputPerMillion: 0.5,
    outputPerMillion: 3.0,
  },
  "gemini-3.1-pro-preview": {
    inputPerMillion: 2.0,
    outputPerMillion: 12.0,
  },
  "gemini-3.1-flash-lite-preview": {
    inputPerMillion: 0.25,
    outputPerMillion: 1.5,
  },
  "gpt-5.4-2026-03-05": {
    inputPerMillion: 2.5,
    outputPerMillion: 15.0,
  },
  "gpt-5.3-codex": {
    inputPerMillion: 1.75,
    outputPerMillion: 14.0,
  },
  "gpt-5-mini-2025-08-07": {
    inputPerMillion: 0.25,
    outputPerMillion: 2.0,
  },
};

export interface TokenCost {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

export namespace TokenCostHelper {
  export const calculateCost = (
    inputTokens: number,
    outputTokens: number,
    model: string = "claude-sonnet-4-5-20250929",
    cacheCreationInputTokens: number = 0,
    cacheReadInputTokens: number = 0,
  ): TokenCost => {
    const pricing = MODEL_PRICING[model];

    if (!pricing) {
      return { inputCost: 0, outputCost: 0, totalCost: 0 };
    }

    const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
    // Cache writes cost 25% more, cache reads cost 90% less
    const cacheWriteCost =
      (cacheCreationInputTokens / 1_000_000) * pricing.inputPerMillion * 1.25;
    const cacheReadCost =
      (cacheReadInputTokens / 1_000_000) * pricing.inputPerMillion * 0.1;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost + cacheWriteCost + cacheReadCost,
    };
  };

  export const formatCost = (cost: number): string => {
    return `$${cost.toFixed(6)}`;
  };

  export const getSupportedModels = (): string[] => {
    return Object.keys(MODEL_PRICING);
  };

  export const getModelPricing = (model: string): ModelPricing | undefined => {
    return MODEL_PRICING[model];
  };
}
