import { describe, expect, test } from "bun:test";
import tools from "../../src/tools";
import { getAllToolDefinitions, isKnownTool } from "../../src/tools";

describe("Tool contract", () => {
  const toolEntries = Object.entries(tools);

  test("every tool has a definition with name, description, inputSchema", () => {
    for (const [, tool] of toolEntries) {
      expect(tool.definition).toBeDefined();
      expect(typeof tool.definition.name).toBe("string");
      expect(tool.definition.name.length).toBeGreaterThan(0);
      expect(typeof tool.definition.description).toBe("string");
      expect(tool.definition.description.length).toBeGreaterThan(0);
      expect(tool.definition.inputSchema).toBeDefined();
    }
  });

  test("every tool has callFunction, requiresPermission, describeUse", () => {
    for (const [, tool] of toolEntries) {
      expect(typeof tool.callFunction).toBe("function");
      expect(typeof tool.requiresPermission).toBe("boolean");
      expect(typeof tool.describeUse).toBe("function");
    }
  });

  test("getAllToolDefinitions returns all built-in tools", () => {
    const definitions = getAllToolDefinitions();
    expect(definitions.length).toBeGreaterThanOrEqual(toolEntries.length);

    const definitionNames = definitions.map((d) => d.name);
    for (const [, tool] of toolEntries) {
      expect(definitionNames).toContain(tool.definition.name);
    }
  });

  test("isKnownTool returns true for all built-in tool names", () => {
    for (const [, tool] of toolEntries) {
      expect(isKnownTool(tool.definition.name)).toBe(true);
    }
  });

  test("isKnownTool returns false for unknown tool names", () => {
    expect(isKnownTool("nonexistent_tool")).toBe(false);
  });
});
