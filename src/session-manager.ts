import { Agent } from "./agent";
import type { ModelId } from "./ai";
import { type Provider, SMALL_MODELS } from "./providers";
import { getToolDefinitionsByName, type ToolDefinition } from "./tools";

export class AgentEntry {
  readonly id: string;
  readonly createdAt: Date;
  readonly tools: ToolDefinition[];
  private agent: Agent;

  constructor(id: string, agent: Agent, tools: ToolDefinition[]) {
    this.id = id;
    this.agent = agent;
    this.createdAt = new Date();
    this.tools = tools;
  }

  async message(input: string): Promise<string> {
    const result = await this.agent.prompt(input, { tools: this.tools });
    return result.text ?? "Subagent completed but returned no text.";
  }
}

interface SpawnOptions {
  provider: Provider;
  toolNames: string[];
  systemPrompt?: string;
}

export class SessionManager {
  private agents: Map<string, AgentEntry> = new Map();
  private nextId = 1;

  spawn(model: ModelId, options: SpawnOptions): AgentEntry {
    const { provider, toolNames, systemPrompt } = options;
    const id = `agent-${this.nextId++}`;
    const agent = new Agent(model, provider, systemPrompt);
    const tools = getToolDefinitionsByName(toolNames);
    const entry = new AgentEntry(id, agent, tools);
    this.agents.set(id, entry);
    return entry;
  }

  spawnSmallModel(options: SpawnOptions): AgentEntry {
    return this.spawn(SMALL_MODELS[options.provider], options);
  }

  get(id: string): AgentEntry | undefined {
    return this.agents.get(id);
  }

  remove(id: string): boolean {
    return this.agents.delete(id);
  }

  getAll(): AgentEntry[] {
    return Array.from(this.agents.values());
  }

  count(): number {
    return this.agents.size;
  }
}
