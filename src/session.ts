import { readFileSync } from "fs";
import { join } from "path";
import EventEmitter from "events";

import { type MessageDelta } from "./ai";
import { Agent } from "./agent";
import { toolUseDescription, type ToolName } from "./tools";

export interface UIMessage {
  role: "user" | "assistant";
  text: string;
}

export interface ToolUseRequest {
  toolName: string;
  description: string;
}

const SYSTEM_PROMPT_PATH = join(__dirname, "prompts/system_workflow.md");

export class Session {
  agent = new Agent(readFileSync(SYSTEM_PROMPT_PATH, "utf8"));
  eventEmitter = new EventEmitter();
  canUseToolHandler?: (request: ToolUseRequest) => Promise<boolean>;

  async prompt(input: string) {
    const stream = this.agent.stream(input, {
      canUseTool: this.handleToolUseRequest.bind(this),
      emitMessage: this.handleEmitMessage.bind(this),
    });
    for await (const event of stream) {
      this.processDelta(event);
    }
  }

  async handleToolUseRequest(toolName: string, input: unknown) {
    const description = toolUseDescription(toolName as ToolName, input);
    const canUse = await this.canUseToolHandler?.({ toolName, description });
    return canUse || false;
  }

  handleEmitMessage(message: string) {
    this.eventEmitter.emit("message_start", { role: "assistant" });
    this.eventEmitter.emit("message_update", { text: message });
  }

  processDelta(delta: MessageDelta) {
    if (delta.type === "message_start") {
      this.eventEmitter.emit("message_start", { role: delta.role });
    }

    if (delta.type == "text_start" || delta.type == "text_update") {
      this.eventEmitter.emit("message_update", { text: delta.text });
    }
  }
}
