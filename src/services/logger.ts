import { join } from "path";
import { homedir } from "os";
import { mkdirSync, existsSync } from "fs";
import type { MessageParam } from "../types/messages";
import type { ToolUseContent } from "../types/messages";
import type { FileSink } from "bun";

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

export interface ConversationLogEntry {
  timestamp: string;
  sessionId: string;
  type: "message" | "tool_call" | "tool_result" | "summary";
  role?: "user" | "assistant";
  content: any;
  metadata?: {
    model?: string;
    provider?: string;
    tokens?: {
      input: number;
      output: number;
      total: number;
    };
    cost?: number;
  };
}

export interface DebugLogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: any;
}

export class Logger {
  private sessionId: string;
  private conversationWriter: FileSink;
  private debugWriter: FileSink;
  private debugLevel: LogLevel = LogLevel.INFO;

  constructor(sessionId?: string) {
    this.sessionId = sessionId || this.generateSessionId();
    const logDir = join(homedir(), ".dim", "logs");

    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }

    const datestamp = new Date().toISOString().split("T")[0];
    this.conversationWriter = Bun.file(join(logDir, `conversation-${datestamp}.jsonl`)).writer();
    this.debugWriter = Bun.file(join(logDir, `debug-${datestamp}.log`)).writer();

    this.logConversation({
      type: "message",
      content: { type: "session_start", sessionId: this.sessionId },
    });
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  logConversation(entry: Omit<ConversationLogEntry, "timestamp" | "sessionId">) {
    const logEntry: ConversationLogEntry = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      ...entry,
    };

    this.conversationWriter.write(JSON.stringify(logEntry) + "\n");
  }

  logMessage(message: MessageParam, metadata?: ConversationLogEntry["metadata"]) {
    this.logConversation({
      type: "message",
      role: message.role,
      content: message.content,
      metadata,
    });
  }

  logToolCall(toolUse: ToolUseContent) {
    this.logConversation({
      type: "tool_call",
      content: {
        name: toolUse.name,
        id: toolUse.id,
        input: toolUse.input,
      },
    });
  }

  logToolResult(toolId: string, result: any, error?: Error) {
    this.logConversation({
      type: "tool_result",
      content: {
        toolId,
        result: error ? { error: error.message } : result,
        success: !error,
      },
    });
  }

  logSummary(originalTokens: number, summaryTokens: number) {
    this.logConversation({
      type: "summary",
      content: {
        originalTokens,
        summaryTokens,
        reduction: Math.round((1 - summaryTokens / originalTokens) * 100) + "%",
      },
    });
  }

  debug(component: string, message: string, data?: any) {
    this.log(LogLevel.DEBUG, component, message, data);
  }

  info(component: string, message: string, data?: any) {
    this.log(LogLevel.INFO, component, message, data);
  }

  warn(component: string, message: string, data?: any) {
    this.log(LogLevel.WARN, component, message, data);
  }

  error(component: string, message: string, data?: any) {
    this.log(LogLevel.ERROR, component, message, data);
  }

  private log(level: LogLevel, component: string, message: string, data?: any) {
    if (this.shouldLog(level)) {
      const timestamp = new Date().toISOString();
      const logLine = `[${timestamp}] [${level}] [${component}] ${message}${
        data ? ` ${JSON.stringify(data)}` : ""
      }\n`;

      this.debugWriter.write(logLine);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.debugLevel);
  }

  setDebugLevel(level: LogLevel) {
    this.debugLevel = level;
  }

  async flush() {
    await this.conversationWriter.flush();
    await this.debugWriter.flush();
  }

  async end() {
    await this.conversationWriter.end();
    await this.debugWriter.end();
  }
}

// No-op logger that silently discards all log calls
const noopLogger: Logger = {
  getSessionId: () => "",
  logConversation: () => {},
  logMessage: () => {},
  logToolCall: () => {},
  logToolResult: () => {},
  logSummary: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  setDebugLevel: () => {},
} as unknown as Logger;

// Singleton instance for the current session
let currentLogger: Logger = noopLogger;

export function initializeLogger(sessionId?: string): Logger {
  currentLogger = new Logger(sessionId);
  return currentLogger;
}

export function getLogger(): Logger {
  return currentLogger;
}
