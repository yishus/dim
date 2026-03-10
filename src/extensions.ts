import { readdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

import type {
  ExtensionTool,
  ExtensionCommand,
  ActivateFunction,
  AnyExtensionSessionHook,
  ExtensionSessionHook,
  ExtensionSessionEvent,
  ExtensionSessionEventContext,
  ExtensionSessionHookResponse,
} from "./types/extensions";

export interface LoadedExtension {
  name: string;
  path: string;
}

export class ExtensionAPI {
  private registry: ExtensionRegistry;

  constructor(registry: ExtensionRegistry) {
    this.registry = registry;
  }

  on<TEvent extends ExtensionSessionEvent>(
    event: TEvent,
    handler: ExtensionSessionHook<TEvent>,
  ): void {
    const handlers = this.registry.hooks.get(event);
    if (handlers) {
      handlers.push(handler as unknown as AnyExtensionSessionHook);
      return;
    }
    this.registry.hooks.set(
      event,
      [handler as unknown as AnyExtensionSessionHook],
    );
  }

  registerTool(tool: ExtensionTool<any>): void {
    if (this.registry.tools.has(tool.name)) {
      throw new Error(`Extension tool "${tool.name}" is already registered.`);
    }
    this.registry.tools.set(tool.name, tool);
  }

  registerCommand(cmd: ExtensionCommand): void {
    this.registry.commands.push(cmd);
  }
}

export class ExtensionRegistry {
  tools = new Map<string, ExtensionTool<any>>();
  commands: ExtensionCommand[] = [];
  loadedExtensions: LoadedExtension[] = [];
  hooks = new Map<
    ExtensionSessionEvent,
    Array<AnyExtensionSessionHook>
  >();

  async runHook<TEvent extends ExtensionSessionEvent>(
    event: TEvent,
    context: ExtensionSessionEventContext<TEvent>,
  ): Promise<Partial<ExtensionSessionHookResponse<TEvent>>> {
    const handlers = this.hooks.get(event);
    if (!handlers?.length) {
      return {};
    }

    const response: Partial<ExtensionSessionHookResponse<TEvent>> = {};

    for (const handler of handlers) {
      const result = await (
        handler as unknown as ExtensionSessionHook<TEvent>
      )(context);
      if (result && typeof result === "object") {
        Object.assign(response, result);
      }
    }

    return response;
  }
}

export class ExtensionLoader {
  static async loadAll(): Promise<ExtensionRegistry> {
    const registry = new ExtensionRegistry();
    const dirs = [
      join(homedir(), ".dim", "extensions"),
      join(process.cwd(), ".dim", "extensions"),
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) continue;

      let entries;
      try {
        entries = readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        const extensionPath = entry.isDirectory()
          ? join(dir, entry.name, "index.ts")
          : entry.isFile() && entry.name.endsWith(".ts")
            ? join(dir, entry.name)
            : undefined;
        if (!extensionPath || !existsSync(extensionPath)) continue;

        const extensionName = entry.isDirectory()
          ? entry.name
          : entry.name.slice(0, -3);

        try {
          const mod = await import(extensionPath);
          const activate: ActivateFunction = mod.default;
          if (typeof activate !== "function") {
            console.warn(
              `Extension "${extensionName}" does not export a default activate function, skipping.`,
            );
            continue;
          }
          const api = new ExtensionAPI(registry);
          await activate(api);
          registry.loadedExtensions.push({
            name: extensionName,
            path: extensionPath,
          });
        } catch (err) {
          console.warn(`Failed to load extension "${extensionName}":`, err);
        }
      }
    }

    return registry;
  }
}
