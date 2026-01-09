import { AnthropicProvider } from "./providers/anthropic";
import { AuthStorage } from "./auth-storage";
import { Provider } from "./providers";

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

interface TextEndDelta {
  type: "text_end";
}

interface IgnoredDelta {
  type: "ignored";
}

export type MessageDelta =
  | MessageStartDelta
  | TextStartDelta
  | TextUpdateDelta
  | TextEndDelta
  | IgnoredDelta;

interface MessageTextContent {
  type: "text";
  text: string;
}

export interface Message {
  role: "user" | "assistant";
  content: MessageTextContent;
}

export namespace AI {
  export const stream = (provider: Provider, input: Message[]) => {
    const authStorage = new AuthStorage();

    switch (provider) {
      case Provider.Anthropic:
        const apiKey = authStorage.get(Provider.Anthropic);
        const stream = AnthropicProvider.stream(input, { apiKey });
        return stream;
    }
  };
}
