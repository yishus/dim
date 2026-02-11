import type {
  MessageParam,
  MessageResponse,
  MessageDelta,
} from "./messages";
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
  | "claude-sonnet-4-5-20250929"
  | "claude-opus-4-20250514"
  | "claude-haiku-4-5-20251001";

export type GoogleModelId =
  | "gemini-3-flash-preview"
  | "gemini-3-pro-preview"
  | "gemini-2.5-pro"
  | "gemini-2.0-flash";

export type OpenAIModelId =
  | "gpt-5.2-codex"
  | "gpt-5.1-codex-mini"
  | "gpt-4o-mini";

export type ModelId = AnthropicModelId | GoogleModelId | OpenAIModelId;
