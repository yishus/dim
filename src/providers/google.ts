import {
  GoogleGenAI,
  type Content,
  type Part,
  type FunctionDeclaration,
  type GenerateContentResponse,
  type FunctionCall,
  Type,
} from "@google/genai";

import type {
  ContentBlock,
  MessageResponse,
  MessageParam,
  MessageDelta,
} from "../ai";
import type { Tool } from "../tools";

export type GoogleModelId = "gemini-3-flash-preview" | "gemini-2.5-pro";

export const DEFAULT_GOOGLE_MODEL: GoogleModelId = "gemini-3-flash-preview";

export const AVAILABLE_GOOGLE_MODELS: { id: GoogleModelId; name: string }[] = [
  { id: "gemini-3-flash-preview", name: "Gemini 3 Flash Preview" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
];

export interface GoogleStreamOptions {
  apiKey?: string;
  tools?: Tool<any>[];
  systemPrompt?: string;
  model?: GoogleModelId;
}

export namespace GoogleProvider {
  export const prompt = async (
    input: MessageParam[],
    options?: GoogleStreamOptions,
  ) => {
    const { apiKey, tools, model = DEFAULT_GOOGLE_MODEL } = options || {};

    if (!apiKey) {
      throw new Error("Google API key is required");
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: input.map(message_param_to_google_content),
      config: {
        tools: tools
          ? [{ functionDeclarations: tools.map(tool_to_function_declaration) }]
          : undefined,
      },
    });

    return google_response_to_message_response(response);
  };

  export const stream = (
    input: MessageParam[],
    options?: GoogleStreamOptions,
  ) => {
    const {
      apiKey,
      systemPrompt,
      tools,
      model = DEFAULT_GOOGLE_MODEL,
    } = options || {};

    if (!apiKey) {
      throw new Error("Google API key is required");
    }

    const ai = new GoogleGenAI({ apiKey });
    const streamResponse = ai.models.generateContentStream({
      model,
      contents: input.map(message_param_to_google_content),
      config: {
        tools: tools
          ? [{ functionDeclarations: tools.map(tool_to_function_declaration) }]
          : undefined,
        systemInstruction: systemPrompt,
      },
    });

    // Shared state accumulated by streamText
    let accumulatedText = "";
    let accumulatedFunctionCalls: FunctionCall[] = [];
    let streamComplete: Promise<void>;
    let resolveStreamComplete: () => void;

    // Create a promise that resolves when streaming is complete
    streamComplete = new Promise((resolve) => {
      resolveStreamComplete = resolve;
    });

    return {
      fullMessage: async function () {
        // Wait for streamText to finish accumulating data
        await streamComplete;
        return google_response_to_message_response({
          text: accumulatedText,
          functionCalls: accumulatedFunctionCalls,
        } as GenerateContentResponse);
      },
      streamText: async function* () {
        let isFirst = true;

        const response = await streamResponse;
        for await (const chunk of response) {
          if (isFirst) {
            yield { type: "message_start", role: "assistant" } as MessageDelta;
            isFirst = false;
          }

          // Accumulate data into shared state
          const chunkText = chunk.text || "";
          const chunkFunctionCalls = chunk.functionCalls || [];
          accumulatedText += chunkText;
          (accumulatedFunctionCalls = accumulatedFunctionCalls).concat(
            chunkFunctionCalls,
          );

          yield { type: "text_update", text: chunkText };
        }

        // Signal that streaming is complete
        resolveStreamComplete();
      },
    };
  };

  const tool_to_function_declaration = (
    tool: Tool<any>,
  ): FunctionDeclaration => {
    return {
      name: tool.definition.name,
      description: tool.definition.description,
      parameters: typebox_to_google_schema(tool.definition.input_schema),
    };
  };

  const typebox_to_google_schema = (schema: any): any => {
    if (!schema) return undefined;

    const result: any = {};

    if (schema.type === "object") {
      result.type = Type.OBJECT;
      if (schema.properties) {
        result.properties = {};
        for (const [key, value] of Object.entries(schema.properties)) {
          result.properties[key] = typebox_to_google_schema(value);
        }
      }
      if (schema.required) {
        result.required = schema.required;
      }
    } else if (schema.type === "string") {
      result.type = Type.STRING;
    } else if (schema.type === "number" || schema.type === "integer") {
      result.type = Type.NUMBER;
    } else if (schema.type === "boolean") {
      result.type = Type.BOOLEAN;
    } else if (schema.type === "array") {
      result.type = Type.ARRAY;
      if (schema.items) {
        result.items = typebox_to_google_schema(schema.items);
      }
    }

    if (schema.description) {
      result.description = schema.description;
    }

    return result;
  };

  const message_param_to_google_content = (message: MessageParam): Content => {
    const parts: Part[] = [];

    for (const content of message.content) {
      if (content.type === "text") {
        parts.push({ text: content.text });
      } else if (content.type === "tool_use") {
        parts.push({
          functionCall: {
            name: content.name,
            args: content.input as Record<string, unknown>,
          },
        });
      } else if (content.type === "tool_result") {
        const textContent = content.content
          .filter((c) => c.type === "text")
          .map((c) => c.text)
          .join("\n");
        parts.push({
          functionResponse: {
            name: content.tool_use_id,
            response: { result: textContent },
          },
        });
      }
    }

    return {
      role: message.role === "assistant" ? "model" : "user",
      parts,
    };
  };

  const google_response_to_message_response = (
    response: GenerateContentResponse,
  ): MessageResponse => {
    const content: ContentBlock[] = [];

    console.log("Google Response:", response);

    if (response.text) {
      content.push({ type: "text", text: response.text });
    }

    if (response.functionCalls) {
      for (const funcCall of response.functionCalls) {
        if (!funcCall.args || !funcCall.name || !funcCall.id) continue;
        content.push({
          type: "tool_use",
          id: funcCall.id,
          name: funcCall.name,
          input: funcCall.args,
        });
      }
    }

    const usage = response.usageMetadata || {};

    console.log(content);

    return {
      message: {
        role: "assistant",
        content,
      },
      usage: {
        input_tokens: usage.promptTokenCount || 0,
        output_tokens: usage.candidatesTokenCount || 0,
      },
    };
  };
}
