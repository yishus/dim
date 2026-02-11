import type { ToolDefinition } from "./tools";
import type { AskUserQuestionInput } from "../tools/ask-user-question";
import type { QuestionAnswer } from "./session";
import type { MessageParam } from "./messages";

export interface PromptOptions {
  tools: ToolDefinition[];
  canUseTool?: (name: string, input: unknown) => Promise<boolean>;
  askUserQuestion?: (input: AskUserQuestionInput) => Promise<QuestionAnswer[]>;
  emitMessage?: (message: string) => void;
  saveToSessionMemory?: (key: string, value: unknown) => void;
  updateTokenUsage?: (
    input_tokens: number,
    output_tokens: number,
    cache_creation_input_tokens?: number,
    cache_read_input_tokens?: number,
  ) => void;
}

export interface ToolRunnerCallbacks {
  canUseTool?: (name: string, input: unknown) => Promise<boolean>;
  askUserQuestion?: (input: AskUserQuestionInput) => Promise<QuestionAnswer[]>;
  emitMessage?: (message: string) => void;
  saveToSessionMemory?: (key: string, value: unknown) => void;
}

export interface SummarizeResult {
  context: MessageParam[];
  contextTokens: number;
}
