import { AI } from "./ai";
import type { Message, MessageParam, ModelId } from "./types";
import type { PromptOptions } from "./types";
import { Provider } from "./types";
import { maybeSummarize } from "./summarizer";
import { runToolCalls } from "./tool-runner";
import { isAbortError } from "./errors";

export class Agent {
  private context: MessageParam[] = [];
  private contextTokens: number = 0;
  private abortController?: AbortController;

  constructor(
    public model: ModelId,
    public provider: Provider,
    public systemPrompt?: string,
    public systemReminderStart?: string,
  ) {}

  cancel() {
    this.abortController?.abort();
  }

  async *stream(input: string | undefined, options: PromptOptions) {
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

    this.abortController = new AbortController();
    const { signal } = this.abortController;

    try {
      while (true) {
        const { fullMessage, streamText } = AI.stream(
          this.provider,
          this.context,
          this.systemPrompt,
          this.model,
          tools,
          signal,
        );

        for await (const event of streamText()) {
          yield event;
        }

        if (signal.aborted) return;

        const { message, usage } = await fullMessage();
        updateTokenUsage?.(
          usage.input_tokens,
          usage.output_tokens,
          usage.cache_creation_input_tokens,
          usage.cache_read_input_tokens,
        );
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
          { provider: this.provider, model: this.model },
          { canUseTool, askUserQuestion, emitMessage, saveToSessionMemory },
        );
        this.context.push(resultMessage);

        if (interrupted) {
          break;
        }
      }
    } catch (err) {
      if (isAbortError(err)) return;
      throw err;
    }
  }

  async prompt(input: string, options: PromptOptions) {
    const {
      tools,
      canUseTool,
      askUserQuestion,
      emitMessage,
      saveToSessionMemory,
      updateTokenUsage,
    } = options;
    const messages: MessageParam[] = [...this.context, this.nextMessage(input)];

    while (true) {
      const { message, usage } = await AI.prompt(
        this.provider,
        messages,
        this.model,
        tools,
      );
      updateTokenUsage?.(
        usage.input_tokens,
        usage.output_tokens,
        usage.cache_creation_input_tokens,
        usage.cache_read_input_tokens,
      );

      messages.push(message);

      if (message.content.every((c) => c.type !== "tool_use")) {
        return { message, text: this.textResponse(message) };
      }

      const { resultMessage, interrupted } = await runToolCalls(
        message,
        { provider: this.provider, model: this.model },
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
