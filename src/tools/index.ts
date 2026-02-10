import type { Static, TSchema } from "typebox";

import { Provider } from "../providers";
import type { ModelId } from "../ai";
import type { ExtensionRegistry, ExtensionTool } from "../extensions";
import { getSession } from "../session";
import askUserQuestion from "./ask-user-question";
import bash from "./bash";
import edit from "./edit";
import glob from "./glob";
import grep from "./grep";
import read from "./read";
import webFetch from "./web-fetch";
import write from "./write";

export type {
  AskUserQuestionInput,
  QuestionInput,
  OptionInput,
} from "./ask-user-question";

export interface ToolConfig {
  provider: Provider;
  model: ModelId;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: TSchema;
}

export interface Tool<T extends TSchema> {
  definition: {
    name: string;
    description: string;
    inputSchema: T;
  };
  callFunction: (args: Static<T>, config: ToolConfig) => Promise<string>;
  requiresPermission: boolean;
  describeUse: (input: Static<T>) => string;
}

const tools = {
  askUserQuestion,
  bash,
  edit,
  glob,
  grep,
  read,
  webFetch,
  write,
};

export type ToolName = keyof typeof tools;

// Type map that extracts input types from each tool
export type ToolInputMap = {
  [K in ToolName]: Static<(typeof tools)[K]["definition"]["inputSchema"]>;
};

// Extension tools storage
let extensionTools = new Map<string, ExtensionTool<any>>();

export function registerExtensionTools(registry: ExtensionRegistry): void {
  extensionTools = registry.tools;
}

// Typed call function that preserves the relationship
export async function callTool(
  name: string,
  input: unknown,
  config: ToolConfig,
): Promise<string> {
  try {
    const builtinTool = tools[name as ToolName];
    if (builtinTool) {
      return await builtinTool.callFunction(input as never, config);
    }
    const extensionTool = extensionTools.get(name);
    if (extensionTool) {
      return await extensionTool.execute(input as never, {
        sessionManager: getSession().sessionManager,
        provider: config.provider,
        model: config.model,
      });
    }
    return `Error: Tool "${name}" not found.`;
  } catch (error) {
    if (error instanceof Error) {
      return `Error: ${error.message}`;
    }
    return "Error: Unknown error occurred";
  }
}

export function getToolPermission(name: string): boolean {
  const tool = tools[name as ToolName] ?? extensionTools.get(name);
  return tool.requiresPermission;
}

export function getToolDescription(name: string, input: unknown): string {
  const tool = tools[name as ToolName] ?? extensionTools.get(name);
  return tool.describeUse(input as never);
}

export function isKnownTool(name: string): boolean {
  return name in tools || extensionTools.has(name);
}

export function getAllToolDefinitions(): ToolDefinition[] {
  const builtins = Object.values(tools).map((tool) => tool.definition);
  const extensions = Array.from(extensionTools.values()).map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  }));
  return [...builtins, ...extensions];
}

export function getToolDefinitionsByName(names: string[]): ToolDefinition[] {
  const nameSet = new Set(names);
  return getAllToolDefinitions().filter((t) => nameSet.has(t.name));
}

export default tools;
