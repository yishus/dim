import { describe, expect, test } from "bun:test";
import { TokenCostHelper } from "../../src/token-cost";

describe("TokenCostHelper", () => {
  describe("calculateCost", () => {
    test("returns correct cost for claude-sonnet-4-5-20250929", () => {
      const cost = TokenCostHelper.calculateCost(
        1_000_000,
        1_000_000,
        "claude-sonnet-4-5-20250929",
      );
      expect(cost.inputCost).toBe(3.0);
      expect(cost.outputCost).toBe(15.0);
      expect(cost.totalCost).toBe(18.0);
    });

    test("returns correct cost for gemini-2.0-flash", () => {
      const cost = TokenCostHelper.calculateCost(
        1_000_000,
        1_000_000,
        "gemini-2.0-flash",
      );
      expect(cost.inputCost).toBeCloseTo(0.1);
      expect(cost.outputCost).toBeCloseTo(0.4);
      expect(cost.totalCost).toBeCloseTo(0.5);
    });

    test("returns zeros for unknown models", () => {
      const cost = TokenCostHelper.calculateCost(
        1_000_000,
        1_000_000,
        "unknown-model",
      );
      expect(cost.inputCost).toBe(0);
      expect(cost.outputCost).toBe(0);
      expect(cost.totalCost).toBe(0);
    });

    test("applies cache write cost modifier (25% more)", () => {
      const cost = TokenCostHelper.calculateCost(
        0,
        0,
        "claude-sonnet-4-5-20250929",
        1_000_000, // cache creation tokens
        0,
      );
      // 1M tokens * $3/M * 1.25 = $3.75
      expect(cost.totalCost).toBeCloseTo(3.75);
    });

    test("applies cache read cost modifier (90% less)", () => {
      const cost = TokenCostHelper.calculateCost(
        0,
        0,
        "claude-sonnet-4-5-20250929",
        0,
        1_000_000, // cache read tokens
      );
      // 1M tokens * $3/M * 0.1 = $0.30
      expect(cost.totalCost).toBeCloseTo(0.3);
    });

    test("uses default model when none specified", () => {
      const cost = TokenCostHelper.calculateCost(1_000_000, 1_000_000);
      // Default is claude-sonnet-4-5-20250929
      expect(cost.totalCost).toBe(18.0);
    });
  });

  describe("formatCost", () => {
    test("formats cost with 6 decimal places", () => {
      expect(TokenCostHelper.formatCost(0.001234)).toBe("$0.001234");
    });

    test("formats zero cost", () => {
      expect(TokenCostHelper.formatCost(0)).toBe("$0.000000");
    });

    test("formats larger cost", () => {
      expect(TokenCostHelper.formatCost(1.5)).toBe("$1.500000");
    });
  });

  describe("getSupportedModels", () => {
    test("returns array of model strings", () => {
      const models = TokenCostHelper.getSupportedModels();
      expect(models).toBeArray();
      expect(models.length).toBeGreaterThan(0);
      expect(models).toContain("claude-sonnet-4-5-20250929");
      expect(models).toContain("gemini-2.0-flash");
    });
  });

  describe("getModelPricing", () => {
    test("returns pricing for known model", () => {
      const pricing = TokenCostHelper.getModelPricing("claude-sonnet-4-5-20250929");
      expect(pricing).toBeDefined();
      expect(pricing!.inputPerMillion).toBe(3.0);
      expect(pricing!.outputPerMillion).toBe(15.0);
    });

    test("returns undefined for unknown model", () => {
      const pricing = TokenCostHelper.getModelPricing("unknown-model");
      expect(pricing).toBeUndefined();
    });
  });
});
