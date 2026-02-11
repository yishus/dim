import { describe, expect, test } from "bun:test";
import { formatMessagesAsText } from "../../src/summarizer";
import type { MessageParam } from "../../src/types";

describe("formatMessagesAsText", () => {
  test("formats text messages correctly", () => {
    const messages: MessageParam[] = [
      {
        role: "user",
        content: [{ type: "text", text: "Hello" }],
      },
      {
        role: "assistant",
        content: [{ type: "text", text: "Hi there!" }],
      },
    ];
    const result = formatMessagesAsText(messages);
    expect(result).toContain("User:\nHello");
    expect(result).toContain("Assistant:\nHi there!");
    expect(result).toContain("---");
  });

  test("formats tool use messages", () => {
    const messages: MessageParam[] = [
      {
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: "123",
            name: "read",
            input: { path: "/test.txt" },
          },
        ],
      },
    ];
    const result = formatMessagesAsText(messages);
    expect(result).toContain("[Tool: read]");
    expect(result).toContain("/test.txt");
  });

  test("formats tool result messages", () => {
    const messages: MessageParam[] = [
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "123",
            name: "read",
            content: [{ type: "text", text: "file contents here" }],
          },
        ],
      },
    ];
    const result = formatMessagesAsText(messages);
    expect(result).toContain("[Tool Result: read]");
    expect(result).toContain("file contents here");
  });

  test("handles empty messages array", () => {
    const result = formatMessagesAsText([]);
    expect(result).toBe("");
  });
});
