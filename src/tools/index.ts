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

export default tools;
