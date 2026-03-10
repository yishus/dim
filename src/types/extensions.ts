import type { Static, TSchema } from "typebox";

import type { SessionManager } from "../session-manager";
import type { Provider, ModelId } from "./providers";
import type { ExtensionAPI } from "../extensions";

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

export type ActivateFunction = (api: ExtensionAPI) => void | Promise<void>;

export interface ExtensionSessionEventMap {
  UserPromptSubmit: {
    context: {
      input: UserPromptSubmitEventInput;
    };
    response: UserPromptSubmitHookResponse;
  };
}

export type ExtensionSessionEvent = keyof ExtensionSessionEventMap;

export type ExtensionSessionHookResponse<
  TEvent extends ExtensionSessionEvent = ExtensionSessionEvent,
> = ExtensionSessionEventMap[TEvent]["response"];

export interface UserPromptSubmitHookResponse {
  systemPrompt?: string;
}

export type ExtensionSessionEventContext<
  TEvent extends ExtensionSessionEvent = ExtensionSessionEvent,
> = ExtensionSessionEventMap[TEvent]["context"];

export type ExtensionSessionHook<
  TEvent extends ExtensionSessionEvent = ExtensionSessionEvent,
> = (
  ctx: ExtensionSessionEventContext<TEvent>,
) => void | Promise<ExtensionSessionHookResponse<TEvent> | void>;

export type AnyExtensionSessionHook = {
  [TEvent in ExtensionSessionEvent]: ExtensionSessionHook<TEvent>;
}[ExtensionSessionEvent];

export interface BaseEventInput {
  model: ModelId;
  provider: Provider;
}

export type UserPromptSubmitEventInput = BaseEventInput & {
  systemPrompt?: string;
};
