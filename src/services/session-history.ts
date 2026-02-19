import { join } from "path";
import { homedir } from "os";
import { readdirSync, readFileSync, statSync } from "fs";
import type { ConversationLogEntry } from "./logger";
import type { UIMessage } from "../types";

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((b: any) => b.type === "text" && typeof b.text === "string")
      .map((b: any) => b.text)
      .join("");
  }
  return "";
}

function getProjectLogDir(): string {
  const projectId = process.cwd().replace(/[/\\]/g, "_").replace(/:/g, "_");
  return join(homedir(), ".dim", "logs", projectId);
}

export interface SessionSummary {
  sessionId: string;
  title: string;
  lastActivity: Date;
}

export function getRecentSessions(limit = 10): SessionSummary[] {
  const logDir = getProjectLogDir();

  let logFiles: { name: string; mtime: Date }[];
  try {
    logFiles = readdirSync(logDir)
      .filter((f) => f.endsWith(".jsonl") && !f.startsWith("debug-"))
      .map((f) => ({ name: f, mtime: statSync(join(logDir, f)).mtime }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  } catch {
    return [];
  }

  const sessions: SessionSummary[] = [];

  for (const file of logFiles) {
    if (sessions.length >= limit) break;

    const sessionId = file.name.replace(".jsonl", "");

    let content: string;
    try {
      content = readFileSync(join(logDir, file.name), "utf8");
    } catch {
      continue;
    }

    let title = "";
    let lastActivity = file.mtime;

    const lines = content.split("\n").filter(Boolean);
    for (const line of lines) {
      let entry: ConversationLogEntry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }

      // Use first user message as title
      if (!title && entry.type === "message" && entry.role === "user") {
        const text = extractText(entry.content);
        if (text) {
          title = text.length > 60 ? text.slice(0, 57) + "..." : text;
        }
      }

      // Track last timestamp
      if (entry.timestamp) {
        const ts = new Date(entry.timestamp);
        if (ts > lastActivity) lastActivity = ts;
      }
    }

    sessions.push({
      sessionId,
      title: title || "Untitled session",
      lastActivity,
    });
  }

  return sessions;
}

export function getSessionMessages(sessionId: string): UIMessage[] {
  const logDir = getProjectLogDir();
  const filePath = join(logDir, `${sessionId}.jsonl`);

  let content: string;
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return [];
  }

  const messages: UIMessage[] = [];
  const lines = content.split("\n").filter(Boolean);

  for (const line of lines) {
    let entry: ConversationLogEntry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    if (entry.type !== "message" || !entry.role) continue;

    const text = extractText(entry.content);
    if (text) {
      messages.push({ role: entry.role, text });
    }
  }

  return messages;
}
