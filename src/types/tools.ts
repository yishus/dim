import type { Static, TSchema } from "typebox";

import type { Provider } from "./providers";
import type { ModelId } from "./providers";
import type { SessionManager } from "../session-manager";

export interface ToolConfig {
  provider: Provider;
  model: ModelId;
  sessionManager: SessionManager;
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
