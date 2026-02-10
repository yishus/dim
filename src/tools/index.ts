import type { Static, TSchema } from "typebox";

import { Provider } from "../providers";
import askUserQuestion from "./ask-user-question";
import bash from "./bash";
import edit from "./edit";
import glob from "./glob";
import grep from "./grep";
import read from "./read";
import webFetch from "./web-fetch";
import write from "./write";

export interface ToolConfig {
  provider: Provider;
}

export interface Tool<T extends TSchema> {
  definition: {
    name: string;
    description: string;
    input_schema: T;
  };
  callFunction: (args: Static<T>, config: ToolConfig) => Promise<string>;
  requiresPermission: boolean;
  describeInput: (input: Static<T>) => string;
}

const tools = { askUserQuestion, bash, edit, glob, grep, read, webFetch, write };

export type ToolName = keyof typeof tools;

// Type map that extracts input types from each tool
export type ToolInputMap = {
  [K in ToolName]: Static<(typeof tools)[K]["definition"]["input_schema"]>;
};

// Typed call function that preserves the relationship
export async function callTool<T extends ToolName>(
  name: T,
  input: ToolInputMap[T],
  config: ToolConfig,
): Promise<string> {
  try {
    return await tools[name].callFunction(input as never, config);
  } catch (error) {
    if (error instanceof Error) {
      return `Error: ${error.message}`;
    }
    return "Error: Unknown error occurred";
  }
}

export function getToolPermission(name: ToolName): boolean {
  return tools[name].requiresPermission;
}

export function getToolDescription(name: ToolName, input: unknown): string {
  return (tools[name] as Tool<any>).describeInput(input);
}

export type {
  AskUserQuestionInput,
  QuestionInput,
  OptionInput,
} from "./ask-user-question";

export default tools;
