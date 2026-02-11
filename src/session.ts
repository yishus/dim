import { mkdir } from "fs/promises";
import { readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { platform, release, tmpdir } from "os";

import {
  type MessageDelta,
  type ModelId,
  type ProviderModel,
  type UIMessage,
  type ToolUseRequest,
  type AskUserQuestionRequest,
  type QuestionAnswer,
  Provider,
} from "./types";
import {
  AVAILABLE_ANTHROPIC_MODELS,
  AVAILABLE_GOOGLE_MODELS,
  AVAILABLE_OPENAI_MODELS,
  DEFAULT_ANTHROPIC_MODEL,
} from "./ai";
import { Agent } from "./agent";
import { getAllToolDefinitions } from "./tools";
import { isAbortError } from "./errors";
import { SessionManager } from "./session-manager";
import { authStorage } from "./auth-storage";
import { EventBus } from "./services/event-bus";
import { CostTracker } from "./services/cost-tracker";
import { FileMemoryService } from "./services/file-memory";
import { ExtensionService } from "./services/extension-service";
import { ToolService } from "./services/tool-service";

export type { ModelId, ProviderModel, UIMessage, ToolUseRequest, AskUserQuestionRequest, QuestionAnswer };
export { Provider };

export const ALL_MODELS: ProviderModel[] = [
  ...AVAILABLE_ANTHROPIC_MODELS.map((m) => ({
    ...m,
    provider: Provider.Anthropic,
  })),
  ...AVAILABLE_GOOGLE_MODELS.map((m) => ({ ...m, provider: Provider.Google })),
  ...AVAILABLE_OPENAI_MODELS.map((m) => ({ ...m, provider: Provider.OpenAI })),
];

const SYSTEM_PROMPT_PATH = join(__dirname, "prompts/system_workflow.md");

function tryExecSync(cmd: string, fallback: string = ""): string {
  try {
    return execSync(cmd).toString().trim();
  } catch {
    return fallback;
  }
}

export class Session {
  agent!: Agent;
  model: ModelId = DEFAULT_ANTHROPIC_MODEL;
  provider: Provider = Provider.Anthropic;
  eventBus = new EventBus();
  costTracker = new CostTracker(this.eventBus);
  fileMemory = new FileMemoryService();
  extensions = new ExtensionService();
  toolService = new ToolService();
  sessionManager = new SessionManager();

  private constructor() {}

  static async create(): Promise<Session> {
    const session = new Session();

    // Load extensions
    await session.extensions.load();

    // Create scratchpad directory if it doesn't exist
    const cwd = process.cwd();
    const scratchpadPath = join(
      tmpdir(),
      "dim",
      cwd.replace(/[:/\\]/g, "-"),
      "scratchpad",
    );
    await mkdir(scratchpadPath, { recursive: true });

    // Read CLAUDE.md (optional)
    let systemReminderStart: string | undefined;
    try {
      const claudeMd = readFileSync(process.cwd() + "/CLAUDE.md", "utf8");
      if (claudeMd) {
        const startReminder = readFileSync(
          join(__dirname, "prompts/system_reminder_start.md"),
          "utf8",
        );
        systemReminderStart = startReminder.replace(
          "${START_CONTEXT}",
          claudeMd,
        );
      }
    } catch {
      // No CLAUDE.md — that's fine
    }

    // Read system prompt (required)
    const readSystemPrompt = readFileSync(SYSTEM_PROMPT_PATH, "utf8");

    // Git info (optional — each call independent)
    const isGitRepo =
      tryExecSync("git rev-parse --is-inside-work-tree") === "true";
    const branch = isGitRepo
      ? tryExecSync("git rev-parse --abbrev-ref HEAD", "unknown")
      : "unknown";
    const gitStatus = isGitRepo
      ? tryExecSync("git status -s")
      : "";
    const recentCommits = isGitRepo
      ? tryExecSync('git log -n 5 --pretty=format:"%h %s"')
      : "";

    const modelName =
      ALL_MODELS.find((m) => m.id === session.model)?.name || "";
    const systemPrompt = readSystemPrompt
      .replace("$cwd", cwd)
      .replace("$isGitRepo", isGitRepo ? "true" : "false")
      .replace("$OS", platform())
      .replace("$OSVersion", release())
      .replace("$date", new Date().toISOString().split("T")[0] || "")
      .replace("$model", modelName)
      .replace("$modelId", session.model)
      .replace("$scratchpadPath", scratchpadPath)
      .replace("$branch", branch)
      .replace("$gitStatus", recentCommits)
      .replace("$recentCommits", gitStatus);

    // Append extension system prompt additions
    const extensionPrompts = session.extensions.getSystemPromptAdditions();
    let finalSystemPrompt = systemPrompt;
    if (extensionPrompts.length > 0) {
      finalSystemPrompt = `${systemPrompt}\n\n${extensionPrompts.join("\n\n")}`;
    }

    session.agent = new Agent(
      session.model,
      session.provider,
      finalSystemPrompt,
      systemReminderStart,
    );

    return session;
  }

  hasApiKeys(): boolean {
    return authStorage.hasAnyKey();
  }

  async prompt(input: string) {
    const stream = this.agent.stream(input, {
      tools: getAllToolDefinitions(),
      canUseTool: this.toolService.requestToolApproval.bind(this.toolService),
      askUserQuestion: this.toolService.askUserQuestion.bind(this.toolService),
      emitMessage: this.handleEmitMessage.bind(this),
      saveToSessionMemory: this.fileMemory.save.bind(this.fileMemory),
      updateTokenUsage: this.handleTokenUsage.bind(this),
    });
    try {
      for await (const event of stream) {
        this.processDelta(event);
      }
    } catch (err) {
      if (!isAbortError(err)) throw err;
    }
    this.eventBus.emit("message_end");
  }

  cancel() {
    this.agent.cancel();
  }

  private handleEmitMessage(message: string) {
    this.eventBus.emit("message_start", { role: "assistant" });
    this.eventBus.emit("message_update", { text: message });
  }

  private handleTokenUsage(
    input_tokens: number,
    output_tokens: number,
    cache_creation_input_tokens?: number,
    cache_read_input_tokens?: number,
  ) {
    this.costTracker.trackUsage(
      input_tokens,
      output_tokens,
      this.agent.model,
      cache_creation_input_tokens,
      cache_read_input_tokens,
    );
  }

  setModel(model: ModelId, provider?: Provider) {
    this.agent.model = model;
    if (provider) {
      this.agent.provider = provider;
    }
  }

  getModel(): ModelId {
    return this.agent.model;
  }

  setProvider(provider: Provider) {
    this.agent.provider = provider;
  }

  getProvider(): Provider {
    return this.agent.provider;
  }

  processDelta(delta: MessageDelta) {
    if (delta.type === "message_start") {
      this.eventBus.emit("message_start", { role: delta.role });
    }

    if (delta.type == "text_update") {
      this.eventBus.emit("message_update", { text: delta.text });
    }
  }
}

let currentSession: Session | undefined;

export function setSession(session: Session): void {
  currentSession = session;
}

export function getSession(): Session {
  if (!currentSession) {
    throw new Error("Session not initialized");
  }
  return currentSession;
}
