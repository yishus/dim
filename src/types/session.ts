import type { ModelId, Provider } from "./providers";
import type { AskUserQuestionInput } from "../tools/ask-user-question";

export interface ProviderModel {
  id: ModelId;
  name: string;
  provider: Provider;
}

export interface UIMessage {
  role: "user" | "assistant";
  text: string;
}

export interface ToolUseRequest {
  toolName: string;
  description: string;
  input: unknown;
}

export interface AskUserQuestionRequest {
  input: AskUserQuestionInput;
}

export interface QuestionAnswer {
  question: string;
  selectedLabels: string[];
  customText?: string;
}
