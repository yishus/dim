import type { Static, TSchema } from "typebox";

import type { SessionManager } from "../session-manager";
import type { Provider, ModelId } from "./providers";

export interface ExtensionToolCallContext {
  sessionManager: SessionManager;
  provider: Provider;
  model: ModelId;
}

export interface ExtensionTool<T extends TSchema> {
  name: string;
  description: string;
  inputSchema: T;
  execute: (args: Static<T>, ctx: ExtensionToolCallContext) => Promise<string>;
  requiresPermission?: boolean;
  describeUse?: (input: Static<T>) => string;
}

export interface ExtensionCommand {
  name: string;
  description: string;
  execute: () => void | Promise<void>;
}

export type ActivateFunction = (api: import("../extensions").ExtensionAPI) => void | Promise<void>;
