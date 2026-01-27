import type { Static, TSchema } from "typebox";

import bash from "./bash";
import edit from "./edit";
import read from "./read";
import webFetch from "./web-fetch";
import write from "./write";

export interface Tool<T extends TSchema> {
  definition: {
    name: string;
    description: string;
    input_schema: T;
  };
  callFunction: (args: Static<T>) => Promise<string>;
}

const tools = { bash, edit, read, webFetch, write };

export type ToolName = keyof typeof tools;

export const requestToolUsePermission: Record<ToolName, boolean> = {
  bash: true,
  edit: true,
  read: false,
  webFetch: true,
  write: true,
};

export const toolUseDescription = (
  toolName: ToolName,
  input: unknown,
): string => {
  switch (toolName) {
    case "bash":
      const bashInput = input as Static<typeof bash.definition.input_schema>;
      return bashInput.command;
    case "edit":
      const editInput = input as Static<typeof edit.definition.input_schema>;
      return `file at path: ${editInput.path}`;
    case "read":
      const readInput = input as Static<typeof read.definition.input_schema>;
      return `file at path: ${readInput.path}`;
    case "webFetch":
      const webFetchInput = input as Static<
        typeof webFetch.definition.input_schema
      >;
      return `URL: ${webFetchInput.url}`;
    case "write":
      const writeInput = input as Static<typeof write.definition.input_schema>;
      return `file at path: ${writeInput.path}`;
  }
};

export default tools;
