import type { MessageParam, MessageResponse, MessageDelta } from "./messages";
import type { ToolDefinition } from "./tools";

export enum Provider {
  Anthropic = "anthropic",
  Google = "google",
  OpenAI = "openai",
}

export interface StreamOptions {
  apiKey?: string;
  tools?: ToolDefinition[];
  systemPrompt?: string;
  model?: ModelId;
  signal?: AbortSignal;
}

export interface StreamResult {
  fullMessage: () => Promise<MessageResponse>;
  streamText: () => AsyncGenerator<MessageDelta>;
}

export interface ProviderInterface {
  prompt(
    input: MessageParam[],
    options?: StreamOptions,
  ): Promise<MessageResponse>;
  stream(input: MessageParam[], options?: StreamOptions): StreamResult;
}

export type AnthropicModelId =
  | "claude-opus-4-6"
  | "claude-sonnet-4-6"
  | "claude-haiku-4-5-20251001";

export type GoogleModelId =
  | "gemini-3.1-pro-preview"
  | "gemini-3-flash-preview"
  | "gemini-3.1-flash-lite-preview";

export type OpenAIModelId =
  | "gpt-5.4-2026-03-05"
  | "gpt-5.3-codex"
  | "gpt-5-mini-2025-08-07";

export type ModelId = AnthropicModelId | GoogleModelId | OpenAIModelId;
