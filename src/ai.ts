import {
  AnthropicProvider,
  type ModelId as AnthropicModelId,
} from "./providers/anthropic";
import { GoogleProvider, type GoogleModelId } from "./providers/google";
import { AuthStorage } from "./auth-storage";
import { Provider } from "./providers";
import tools from "./tools";

export type { ModelId as AnthropicModelId } from "./providers/anthropic";
export type { GoogleModelId } from "./providers/google";
export { DEFAULT_MODEL, AVAILABLE_MODELS } from "./providers/anthropic";
export {
  DEFAULT_GOOGLE_MODEL,
  AVAILABLE_GOOGLE_MODELS,
} from "./providers/google";

export type ModelId = AnthropicModelId | GoogleModelId;

interface MessageStartDelta {
  type: "message_start";
  role: "user" | "assistant";
}

interface TextStartDelta {
  type: "text_start";
  text: string;
}

interface TextUpdateDelta {
  type: "text_update";
  text: string;
}

interface IgnoredDelta {
  type: "ignored";
}

export type MessageDelta =
  | MessageStartDelta
  | TextStartDelta
  | TextUpdateDelta
  | IgnoredDelta;

interface MessageTextContent {
  type: "text";
  text: string;
}

interface MessageToolUseContent {
  type: "tool_use";
  id: string;
  input: unknown;
  name: string;
}

export type ContentBlock = MessageTextContent | MessageToolUseContent;

export interface MessageResponse {
  message: Message;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface Message {
  role: "user" | "assistant";
  content: ContentBlock[];
}

interface MessageToolResultContent {
  type: "tool_result";
  tool_use_id: string;
  content: MessageTextContent[];
  isError?: boolean;
}

export interface MessageParam {
  role: "user" | "assistant";
  content: Array<ContentBlock | MessageToolResultContent>;
}

export namespace AI {
  export const prompt = async (
    provider: Provider,
    input: MessageParam[],
    model?: ModelId,
  ) => {
    const authStorage = new AuthStorage();

    switch (provider) {
      case Provider.Anthropic: {
        const apiKey = authStorage.get(Provider.Anthropic);
        const response = AnthropicProvider.prompt(input, {
          apiKey,
          tools: Object.values(tools),
          model: model as AnthropicModelId,
        });
        return response;
      }
      case Provider.Google: {
        const apiKey = authStorage.get(Provider.Google);
        const response = GoogleProvider.prompt(input, {
          apiKey,
          tools: Object.values(tools),
          model: model as GoogleModelId,
        });
        return response;
      }
    }
  };

  export const stream = (
    provider: Provider,
    input: MessageParam[],
    systemPrompt?: string,
    model?: ModelId,
  ) => {
    const authStorage = new AuthStorage();

    switch (provider) {
      case Provider.Anthropic: {
        const apiKey = authStorage.get(Provider.Anthropic);
        const stream = AnthropicProvider.stream(input, {
          apiKey,
          systemPrompt,
          tools: Object.values(tools),
          model: model as AnthropicModelId,
        });
        return stream;
      }
      case Provider.Google: {
        const apiKey = authStorage.get(Provider.Google);
        const stream = GoogleProvider.stream(input, {
          apiKey,
          systemPrompt,
          tools: Object.values(tools),
          model: model as GoogleModelId,
        });
        return stream;
      }
    }
  };
}
