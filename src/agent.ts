import { AI, type Message, type MessageParam, type ModelId } from "./ai";
import { Provider } from "./providers";
import type { QuestionAnswer } from "./session";
import { maybeSummarize } from "./summarizer";
import { runToolCalls } from "./tool-runner";
import { type AskUserQuestionInput, type ToolDefinition } from "./tools";

interface StreamOptions {
  tools: ToolDefinition[];
  canUseTool?: (name: string, input: unknown) => Promise<boolean>;
  askUserQuestion?: (input: AskUserQuestionInput) => Promise<QuestionAnswer[]>;
  emitMessage?: (message: string) => void;
  saveToSessionMemory?: (key: string, value: unknown) => void;
  updateTokenUsage?: (input_tokens: number, output_tokens: number) => void;
}

export class Agent {
  private context: MessageParam[] = [];
  private contextTokens: number = 0;

  constructor(
    public model: ModelId,
    public provider: Provider,
    public systemPrompt?: string,
    public systemReminderStart?: string,
  ) {}

  async *stream(input: string | undefined, options: StreamOptions) {
    const {
      tools,
      canUseTool,
      askUserQuestion,
      emitMessage,
      saveToSessionMemory,
      updateTokenUsage,
    } = options;
    if (this.context.length === 0 && this.systemReminderStart) {
      this.context.push({
        role: "user",
        content: [
          {
            type: "text",
            text: this.systemReminderStart,
          },
        ],
      });
    }

    if (input) {
      this.context.push(this.nextMessage(input));
    }

    while (true) {
      const { fullMessage, streamText } = AI.stream(
        this.provider,
        this.context,
        this.systemPrompt,
        this.model,
        tools,
      );

      for await (const event of streamText()) {
        yield event;
      }

      const { message, usage } = await fullMessage();
      updateTokenUsage?.(usage.input_tokens, usage.output_tokens);
      this.contextTokens = usage.input_tokens; // Track current context size

      // Check if we need to summarize before continuing
      const summarizeResult = await maybeSummarize(
        this.context,
        this.contextTokens,
        this.provider,
        emitMessage,
      );
      if (summarizeResult) {
        this.context = summarizeResult.context;
        this.contextTokens = summarizeResult.contextTokens;
      }

      this.context.push(message);
      if (message.content.every((c) => c.type !== "tool_use")) {
        break;
      }

      const { resultMessage, interrupted } = await runToolCalls(
        message,
        this.provider,
        { canUseTool, askUserQuestion, emitMessage, saveToSessionMemory },
      );
      this.context.push(resultMessage);

      if (interrupted) {
        break;
      }
    }
  }

  async prompt(input: string, options: StreamOptions) {
    const {
      tools,
      canUseTool,
      askUserQuestion,
      emitMessage,
      saveToSessionMemory,
      updateTokenUsage,
    } = options;
    const messages: MessageParam[] = [
      ...this.context,
      this.nextMessage(input),
    ];

    while (true) {
      const { message, usage } = await AI.prompt(
        this.provider,
        messages,
        this.model,
        tools,
      );
      updateTokenUsage?.(usage.input_tokens, usage.output_tokens);

      messages.push(message);

      if (message.content.every((c) => c.type !== "tool_use")) {
        return { message, text: this.textResponse(message) };
      }

      const { resultMessage, interrupted } = await runToolCalls(
        message,
        this.provider,
        { canUseTool, askUserQuestion, emitMessage, saveToSessionMemory },
      );
      messages.push(resultMessage);

      if (interrupted) {
        return { message, text: this.textResponse(message) };
      }
    }
  }

  nextMessage(input: string) {
    return {
      role: "user" as const,
      content: [
        {
          type: "text" as const,
          text: input,
        },
      ],
    };
  }

  textResponse(message: Message) {
    for (const content of message.content) {
      if (content.type === "text") {
        return content.text;
      }
    }
  }
}
