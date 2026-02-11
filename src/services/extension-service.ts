import { ExtensionLoader, type ExtensionRegistry } from "../extensions";
import { registerExtensionTools } from "../tools";

export class ExtensionService {
  private registry?: ExtensionRegistry;

  async load(): Promise<void> {
    this.registry = await ExtensionLoader.loadAll();
    registerExtensionTools(this.registry);
  }

  getSystemPromptAdditions(): string[] {
    return this.registry?.systemPromptAdditions ?? [];
  }

  getCommands(): Array<{
    name: string;
    description: string;
    value: string;
    execute: () => void | Promise<void>;
  }> {
    if (!this.registry) return [];
    return this.registry.commands.map((cmd) => ({
      name: cmd.name,
      description: cmd.description,
      value: cmd.name.slice(1),
      execute: cmd.execute,
    }));
  }
}
