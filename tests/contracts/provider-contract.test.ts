import { describe, expect, test } from "bun:test";
import { Provider } from "../../src/types";
import { providers, SMALL_MODELS, PROVIDER_DISPLAY_NAMES } from "../../src/providers";

describe("Provider contract", () => {
  const allProviders = Object.values(Provider);

  test("all providers implement ProviderInterface", () => {
    for (const provider of allProviders) {
      const impl = providers[provider];
      expect(impl).toBeDefined();
      expect(typeof impl.prompt).toBe("function");
      expect(typeof impl.stream).toBe("function");
    }
  });

  test("SMALL_MODELS has entry for every Provider", () => {
    for (const provider of allProviders) {
      expect(SMALL_MODELS[provider]).toBeDefined();
      expect(typeof SMALL_MODELS[provider]).toBe("string");
    }
  });

  test("PROVIDER_DISPLAY_NAMES has entry for every Provider", () => {
    for (const provider of allProviders) {
      expect(PROVIDER_DISPLAY_NAMES[provider]).toBeDefined();
      expect(typeof PROVIDER_DISPLAY_NAMES[provider]).toBe("string");
    }
  });

  test("providers registry has exactly the same providers as enum", () => {
    const registryKeys = Object.keys(providers).sort();
    const enumValues = allProviders.sort();
    expect(registryKeys).toEqual(enumValues);
  });
});
