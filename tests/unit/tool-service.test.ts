import { describe, expect, test } from "bun:test";
import { ToolService } from "../../src/services/tool-service";

describe("ToolService", () => {
  test("requestToolApproval returns false when no handler set", async () => {
    const service = new ToolService();
    const result = await service.requestToolApproval("bash", { command: "ls" });
    expect(result).toBe(false);
  });

  test("requestToolApproval delegates to handler", async () => {
    const service = new ToolService();
    service.canUseToolHandler = async (request) => {
      expect(request.toolName).toBe("bash");
      expect(request.description).toBeTruthy();
      return true;
    };

    const result = await service.requestToolApproval("bash", { command: "ls" });
    expect(result).toBe(true);
  });

  test("askUserQuestion returns empty array when no handler set", async () => {
    const service = new ToolService();
    const result = await service.askUserQuestion({
      question: "test?",
      options: [{ label: "a", value: "a" }],
    } as any);
    expect(result).toEqual([]);
  });

  test("askUserQuestion delegates to handler", async () => {
    const service = new ToolService();
    const mockAnswers = [{ question: "test?", selectedLabels: ["a"] }];
    service.askUserQuestionHandler = async () => mockAnswers;

    const result = await service.askUserQuestion({
      question: "test?",
      options: [{ label: "a", value: "a" }],
    } as any);
    expect(result).toEqual(mockAnswers);
  });
});
