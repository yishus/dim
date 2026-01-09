import Anthropic from "@anthropic-ai/sdk";
import type {
  MessageParam,
  RawMessageStreamEvent,
} from "@anthropic-ai/sdk/resources/messages";

import type { Message, MessageDelta } from "../ai";

export interface AnthropicStreamOptions {
  apiKey?: string;
}

export namespace AnthropicProvider {
  export const stream = async function* (
    input: Message[],
    option?: AnthropicStreamOptions,
  ) {
    const client = new Anthropic({
      apiKey: option?.apiKey,
    });

    const stream = await client.messages.create({
      max_tokens: 1024,
      messages: input.map(message_to_anthropic_message_param),
      model: "claude-sonnet-4-5-20250929",
      stream: true,
    });

    for await (const messageStreamEvent of stream) {
      yield anthropic_delta_to_message_delta(messageStreamEvent);
    }

    return stream;
  };

  const anthropic_delta_to_message_delta = (
    event: RawMessageStreamEvent,
  ): MessageDelta => {
    switch (event.type) {
      case "message_start":
        return {
          type: "message_start",
          role: event.message.role,
        };
      case "content_block_delta":
        if (event.delta.type === "text_delta") {
          return {
            type: "text_update",
            text: event.delta.text,
          };
        }
    }

    return {
      type: "ignored",
    };
  };

  const message_to_anthropic_message_param = (
    messge: Message,
  ): MessageParam => {
    return {
      role: messge.role,
      content: messge.content.text,
    };
  };
}
