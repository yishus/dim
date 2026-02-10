import type {
  MessageParam,
  MessageResponse,
  MessageDelta,
  ModelId,
} from "../ai";
import type { ToolDefinition } from "../tools";
import { SMALL_ANTHROPIC_MODEL, AnthropicProvider } from "./anthropic";
import { SMALL_GOOGLE_MODEL, GoogleProvider } from "./google";
import { SMALL_OPENAI_MODEL, OpenAIProvider } from "./openai";

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

export const providers: Record<Provider, ProviderInterface> = {
  [Provider.Anthropic]: AnthropicProvider,
  [Provider.Google]: GoogleProvider,
  [Provider.OpenAI]: OpenAIProvider,
};

export const SMALL_MODELS: Record<Provider, ModelId> = {
  [Provider.Anthropic]: SMALL_ANTHROPIC_MODEL,
  [Provider.Google]: SMALL_GOOGLE_MODEL,
  [Provider.OpenAI]: SMALL_OPENAI_MODEL,
};

export const PROVIDER_DISPLAY_NAMES: Record<Provider, string> = {
  [Provider.Anthropic]: "Anthropic",
  [Provider.Google]: "Google",
  [Provider.OpenAI]: "OpenAI",
};
