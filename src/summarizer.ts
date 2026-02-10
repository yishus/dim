import { readFile } from "fs/promises";

import { AI, type MessageParam } from "./ai";
import { SUMMARIZATION_TOKEN_THRESHOLD, RECENT_TURNS_TO_KEEP } from "./constants";
import type { Provider } from "./providers";

/**
 * Format messages as readable text for summarization.
 */
export function formatMessagesAsText(messages: MessageParam[]): string {
  const parts: string[] = [];

  for (const message of messages) {
    const role = message.role === "user" ? "User" : "Assistant";
    const contentParts: string[] = [];

    for (const block of message.content) {
      if (block.type === "text") {
        contentParts.push(block.text);
      } else if (block.type === "tool_use") {
        contentParts.push(
          `[Tool: ${block.name}] Input: ${JSON.stringify(block.input).slice(0, 200)}...`,
        );
      } else if (block.type === "tool_result") {
        // Truncate long tool results
        const resultText = block.content
          .map((c) => c.text)
          .join("\n")
          .slice(0, 500);
        contentParts.push(
          `[Tool Result: ${block.name}] ${resultText}${resultText.length >= 500 ? "..." : ""}`,
        );
      }
    }

    parts.push(`${role}:\n${contentParts.join("\n")}`);
  }

  return parts.join("\n\n---\n\n");
}

/**
 * Generate a summary of messages using a small model.
 */
export async function generateSummary(
  provider: Provider,
  messages: MessageParam[],
): Promise<string> {
  const promptTemplate = await readFile(
    new URL("./prompts/summarize.md", import.meta.url),
    "utf-8",
  );

  const conversationText = formatMessagesAsText(messages);
  const prompt = promptTemplate.replace("$conversation", conversationText);

  return AI.summarize(provider, prompt);
}

export interface SummarizeResult {
  context: MessageParam[];
  contextTokens: number;
}

/**
 * Check if context needs summarization and perform it if necessary.
 * Returns the updated context and token count, or null if no summarization was needed.
 */
export async function maybeSummarize(
  context: MessageParam[],
  contextTokens: number,
  provider: Provider,
  emitMessage?: (message: string) => void,
): Promise<SummarizeResult | null> {
  if (contextTokens < SUMMARIZATION_TOKEN_THRESHOLD) {
    return null;
  }

  // Calculate how many messages to keep (recent turns)
  // Each turn is typically 2 messages (user + assistant)
  const recentCount = RECENT_TURNS_TO_KEEP * 2;

  // Don't summarize if we don't have enough messages
  if (context.length <= recentCount) {
    return null;
  }

  const toSummarize = context.slice(0, -recentCount);
  const toKeep = context.slice(-recentCount);

  emitMessage?.("Summarizing conversation context...");

  const summary = await generateSummary(provider, toSummarize);

  // Replace old messages with summary
  const newContext: MessageParam[] = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `<context-summary>\nThe following is a summary of our earlier conversation:\n\n${summary}\n</context-summary>`,
        },
      ],
    },
    ...toKeep,
  ];

  emitMessage?.("Context summarized.");

  return { context: newContext, contextTokens: 0 };
}
