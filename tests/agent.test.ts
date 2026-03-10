import { afterEach, describe, expect, it, mock } from "bun:test";

import { Agent } from "../src/agent";
import { AI, DEFAULT_ANTHROPIC_MODEL } from "../src/ai";
import { Provider } from "../src/types";

const mutableAI = AI as { stream: typeof AI.stream };
const originalStream = AI.stream;

afterEach(() => {
  mutableAI.stream = originalStream;
});

describe("Agent.stream", () => {
  it("uses the per-call system prompt override when provided", async () => {
    const streamMock = mock(() => ({
      async fullMessage() {
        return {
          message: {
            role: "assistant" as const,
            content: [{ type: "text" as const, text: "done" }],
          },
          usage: {
            input_tokens: 0,
            output_tokens: 0,
          },
        };
      },
      async *streamText() {},
    }));
    mutableAI.stream = streamMock as typeof AI.stream;

    const agent = new Agent(
      DEFAULT_ANTHROPIC_MODEL,
      Provider.Anthropic,
      {} as any,
      "original system prompt",
    );

    for await (const _event of agent.stream("hello", {
      tools: [],
      systemPrompt: "overridden prompt",
    })) {
      // exhaust stream
    }

    expect(streamMock).toHaveBeenCalledWith(
      Provider.Anthropic,
      expect.any(Array),
      "overridden prompt",
      DEFAULT_ANTHROPIC_MODEL,
      [],
      expect.any(AbortSignal),
    );
    expect(agent.systemPrompt).toBe("original system prompt");
  });

  it("falls back to the agent system prompt when no override is provided", async () => {
    const streamMock = mock(() => ({
      async fullMessage() {
        return {
          message: {
            role: "assistant" as const,
            content: [{ type: "text" as const, text: "done" }],
          },
          usage: {
            input_tokens: 0,
            output_tokens: 0,
          },
        };
      },
      async *streamText() {},
    }));
    mutableAI.stream = streamMock as typeof AI.stream;

    const agent = new Agent(
      DEFAULT_ANTHROPIC_MODEL,
      Provider.Anthropic,
      {} as any,
      "original system prompt",
    );

    for await (const _event of agent.stream("hello", { tools: [] })) {
      // exhaust stream
    }

    expect(streamMock).toHaveBeenCalledWith(
      Provider.Anthropic,
      expect.any(Array),
      "original system prompt",
      DEFAULT_ANTHROPIC_MODEL,
      [],
      expect.any(AbortSignal),
    );
  });
});
