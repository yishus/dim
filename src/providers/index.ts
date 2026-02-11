import type { ModelId } from "../types";
import { Provider } from "../types";
import type { ProviderInterface } from "../types";
import { SMALL_ANTHROPIC_MODEL, AnthropicProvider } from "./anthropic";
import { SMALL_GOOGLE_MODEL, GoogleProvider } from "./google";
import { SMALL_OPENAI_MODEL, OpenAIProvider } from "./openai";

export { Provider };
export type { StreamOptions, StreamResult, ProviderInterface } from "../types";

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
