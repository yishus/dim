import { Agent } from "./agent";
import type { ModelId } from "./ai";
import type { Provider } from "./providers";

export interface AgentEntry {
  id: string;
  agent: Agent;
  createdAt: Date;
}

export class SessionManager {
  private agents: Map<string, AgentEntry> = new Map();
  private nextId = 1;

  spawn(
    model: ModelId,
    provider: Provider,
    systemPrompt?: string,
    systemReminderStart?: string,
  ): AgentEntry {
    const id = `agent-${this.nextId++}`;
    const agent = new Agent(model, provider, systemPrompt, systemReminderStart);
    const entry: AgentEntry = { id, agent, createdAt: new Date() };
    this.agents.set(id, entry);
    return entry;
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
