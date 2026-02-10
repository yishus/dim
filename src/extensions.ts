import { readdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { TSchema } from "typebox";
import type { ToolConfig } from "./tools";

export interface ExtensionToolDefinition {
  name: string;
  description: string;
  inputSchema: TSchema;
  callFunction: (args: any, config: ToolConfig) => Promise<string>;
  requiresPermission?: boolean;
  describeUse?: (input: unknown) => string;
}

export interface ExtensionCommand {
  name: string;
  description: string;
  execute: () => void | Promise<void>;
}

export type ActivateFunction = (api: ExtensionAPI) => void | Promise<void>;

export class ExtensionAPI {
  private registry: ExtensionRegistry;

  constructor(registry: ExtensionRegistry) {
    this.registry = registry;
  }

  registerTool(tool: ExtensionToolDefinition): void {
    if (this.registry.tools.has(tool.name)) {
      throw new Error(`Extension tool "${tool.name}" is already registered.`);
    }
    this.registry.tools.set(tool.name, tool);
  }

  registerCommand(cmd: ExtensionCommand): void {
    if (!cmd.name.startsWith("/")) {
      throw new Error(
        `Extension command name must start with "/", got "${cmd.name}".`,
      );
    }
    this.registry.commands.push(cmd);
  }

  addSystemPrompt(prompt: string): void {
    this.registry.systemPromptAdditions.push(prompt);
  }
}

export class ExtensionRegistry {
  tools = new Map<string, ExtensionToolDefinition>();
  commands: ExtensionCommand[] = [];
  systemPromptAdditions: string[] = [];
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

      let entries: string[];
      try {
        entries = readdirSync(dir, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name);
      } catch {
        continue;
      }

      for (const entry of entries) {
        const indexPath = join(dir, entry, "index.ts");
        if (!existsSync(indexPath)) continue;

        try {
          const mod = await import(indexPath);
          const activate: ActivateFunction = mod.default;
          if (typeof activate !== "function") {
            console.warn(
              `Extension "${entry}" does not export a default activate function, skipping.`,
            );
            continue;
          }
          const api = new ExtensionAPI(registry);
          await activate(api);
        } catch (err) {
          console.warn(`Failed to load extension "${entry}":`, err);
        }
      }
    }

    return registry;
  }
}
