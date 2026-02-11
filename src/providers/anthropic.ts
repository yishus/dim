import Anthropic from "@anthropic-ai/sdk";
import type {
  Message as AnthropicMessage,
  MessageParam as AnthropicMessageParam,
  RawMessageStreamEvent,
  Tool as AnthropicTool,
} from "@anthropic-ai/sdk/resources/messages";

import type {
  MessageResponse,
  MessageParam,
  MessageDelta,
  ContentBlock,
  AnthropicModelId,
  ProviderInterface,
  StreamOptions,
  ToolDefinition,
} from "../types";

export type { AnthropicModelId } from "../types";

export const DEFAULT_ANTHROPIC_MODEL: AnthropicModelId =
  "claude-sonnet-4-5-20250929";

export const SMALL_ANTHROPIC_MODEL: AnthropicModelId =
  "claude-haiku-4-5-20251001";

export const AVAILABLE_ANTHROPIC_MODELS: {
  id: AnthropicModelId;
  name: string;
}[] = [
  { id: "claude-sonnet-4-5-20250929", name: "Sonnet" },
  { id: "claude-opus-4-20250514", name: "Opus" },
];

export const AnthropicProvider: ProviderInterface = {
  prompt: async (input: MessageParam[], options?: StreamOptions) => {
    const { apiKey, tools, model = DEFAULT_ANTHROPIC_MODEL } = options || {};
    const client = new Anthropic({
      apiKey: apiKey,
    });

    const response = await client.messages.create({
      max_tokens: 16384,
      messages: input.map(message_param_to_anthropic_message_param),
      tools: tools?.map((tool) => tool_definition_to_anthropic_tool(tool)),
      model: model as AnthropicModelId,
    });

    return anthropic_message_to_message_response(response);
  },

  stream: (input: MessageParam[], options?: StreamOptions) => {
    const {
      apiKey,
      systemPrompt,
      tools,
      model = DEFAULT_ANTHROPIC_MODEL,
      signal,
    } = options || {};
    const client = new Anthropic({
      apiKey: apiKey,
    });

    const anthropicMessages = input.map(
      message_param_to_anthropic_message_param,
    );

    // Add cache_control to the last content block of the last message
    const lastMessage = anthropicMessages[anthropicMessages.length - 1];
    if (lastMessage) {
      const content = lastMessage.content;
      if (Array.isArray(content) && content.length > 0) {
        const lastBlock = content[content.length - 1]!;
        (lastBlock as unknown as Record<string, unknown>).cache_control = {
          type: "ephemeral",
        };
      }
    }

    const stream = client.messages.stream(
      {
        max_tokens: 16384,
        messages: anthropicMessages,
        tools: tools?.map((tool) => tool_definition_to_anthropic_tool(tool)),
        model: model as AnthropicModelId,
        system: systemPrompt
          ? [
              {
                type: "text" as const,
                text: systemPrompt,
                cache_control: { type: "ephemeral" as const },
              },
            ]
          : undefined,
      },
      { signal },
    );

    return {
      fullMessage: async function () {
        const message: AnthropicMessage = await stream.finalMessage();
        return anthropic_message_to_message_response(message);
      },
      streamText: async function* () {
        for await (const event of stream) {
          yield anthropic_delta_to_message_delta(event);
        }
      },
    };
  },
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

const message_param_to_anthropic_message_param = (
  message: MessageParam,
): AnthropicMessageParam => {
  const content: AnthropicMessageParam["content"] = [];

  for (const block of message.content) {
    if (block.type === "text") {
      content.push({ type: "text", text: block.text });
    } else if (block.type === "tool_use") {
      // Anthropic always provides IDs, but our generic type allows undefined for Google compatibility
      content.push({
        type: "tool_use",
        id: block.id ?? "",
        name: block.name,
        input: block.input,
      });
    } else if (block.type === "tool_result") {
      content.push({
        type: "tool_result",
        tool_use_id: block.tool_use_id ?? "",
        content: block.content.map((c) => ({
          type: "text" as const,
          text: c.text,
        })),
        is_error: block.isError,
      });
    }
  }

  return {
    role: message.role,
    content,
  };
};

const anthropic_message_to_message_response = (
  message: AnthropicMessage,
): MessageResponse => {
  const content: ContentBlock[] = [];

  for (const block of message.content) {
    if (block.type === "text") {
      content.push({ type: "text", text: block.text });
    } else if (block.type === "tool_use") {
      content.push({
        type: "tool_use",
        id: block.id,
        name: block.name,
        input: block.input,
      });
    }
  }

  return {
    message: {
      role: message.role,
      content,
    },
    usage: {
      input_tokens: message.usage.input_tokens || 0,
      output_tokens: message.usage.output_tokens || 0,
      cache_creation_input_tokens:
        message.usage.cache_creation_input_tokens || 0,
      cache_read_input_tokens: message.usage.cache_read_input_tokens || 0,
    },
  };
};

const tool_definition_to_anthropic_tool = (
  toolDefnition: ToolDefinition,
): AnthropicTool => {
  const { inputSchema, ...rest } = toolDefnition;
  return {
    input_schema: inputSchema as AnthropicTool["input_schema"],
    ...rest,
  };
};
