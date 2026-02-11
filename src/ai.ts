import { authStorage } from "./auth-storage";
import { Provider, type ModelId } from "./types";
import { providers, SMALL_MODELS } from "./providers";
import type { ToolDefinition } from "./types";
import type { MessageParam } from "./types";

export type {
  MessageStartDelta,
  TextUpdateDelta,
  IgnoredDelta,
  MessageDelta,
  TextContent,
  ToolUseContent,
  ToolResultContent,
  ContentBlock,
  MessageContent,
  Message,
  MessageParam,
  Usage,
  MessageResponse,
  ModelId,
} from "./types";

export {
  AVAILABLE_ANTHROPIC_MODELS,
  DEFAULT_ANTHROPIC_MODEL,
} from "./providers/anthropic";
export { AVAILABLE_GOOGLE_MODELS } from "./providers/google";
export { AVAILABLE_OPENAI_MODELS } from "./providers/openai";

function isRetryable(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message;
    return (
      msg.includes("429") ||
      msg.includes("500") ||
      msg.includes("503") ||
      msg.includes("ECONNRESET") ||
      msg.includes("ETIMEDOUT")
    );
  }
  return false;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries || !isRetryable(err)) throw err;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
  throw new Error("unreachable");
}

export namespace AI {
  export const prompt = async (
    provider: Provider,
    input: MessageParam[],
    model?: ModelId,
    tools?: ToolDefinition[],
  ) => {
    const apiKey = authStorage.get(provider);
    return withRetry(() =>
      providers[provider].prompt(input, {
        apiKey,
        tools,
        model,
      }),
    );
  };

  /**
   * Summarize text using the small model for the given provider.
   * Used for context compression when conversation gets too long.
   */
  export const summarize = async (
    provider: Provider,
    text: string,
  ): Promise<string> => {
    const smallModel = SMALL_MODELS[provider];
    const input: MessageParam[] = [
      {
        role: "user",
        content: [{ type: "text", text }],
      },
    ];

    const response = await prompt(provider, input, smallModel);

    // Extract text from response
    for (const block of response.message.content) {
      if (block.type === "text") {
        return block.text;
      }
    }
    return "";
  };

  export const stream = (
    provider: Provider,
    input: MessageParam[],
    systemPrompt?: string,
    model?: ModelId,
    tools?: ToolDefinition[],
    signal?: AbortSignal,
  ) => {
    const apiKey = authStorage.get(provider);
    return providers[provider].stream(input, {
      apiKey,
      systemPrompt,
      tools,
      model,
      signal,
    });
  };
}
