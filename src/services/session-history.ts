import { join } from "path";
import { homedir } from "os";
import { readdirSync, readFileSync } from "fs";
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

export interface SessionSummary {
  sessionId: string;
  title: string;
  lastActivity: Date;
}

export function getRecentSessions(limit = 10): SessionSummary[] {
  const logDir = join(homedir(), ".dim", "logs");

  let logFiles: string[];
  try {
    logFiles = readdirSync(logDir)
      .filter((f) => f.startsWith("conversation-") && f.endsWith(".jsonl"))
      .sort()
      .reverse();
  } catch {
    return [];
  }

  // sessionId -> { title, lastActivity }
  const sessions = new Map<
    string,
    { title: string; lastActivity: string }
  >();

  for (const file of logFiles) {
    if (sessions.size >= limit) break;

    let content: string;
    try {
      content = readFileSync(join(logDir, file), "utf8");
    } catch {
      continue;
    }

    const lines = content.split("\n").filter(Boolean);
    for (const line of lines) {
      let entry: ConversationLogEntry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }

      const existing = sessions.get(entry.sessionId);

      // Track last activity
      if (!existing) {
        sessions.set(entry.sessionId, {
          title: "",
          lastActivity: entry.timestamp,
        });
      } else if (entry.timestamp > existing.lastActivity) {
        existing.lastActivity = entry.timestamp;
      }

      // Use first user message as title
      const session = sessions.get(entry.sessionId)!;
      if (!session.title && entry.type === "message" && entry.role === "user") {
        const text = extractText(entry.content);
        if (text) {
          session.title = text.length > 60 ? text.slice(0, 57) + "..." : text;
        }
      }
    }
  }

  return Array.from(sessions.entries())
    .map(([sessionId, data]) => ({
      sessionId,
      title: data.title || "Untitled session",
      lastActivity: new Date(data.lastActivity),
    }))
    .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
    .slice(0, limit);
}

export function getSessionMessages(sessionId: string): UIMessage[] {
  const logDir = join(homedir(), ".dim", "logs");

  let logFiles: string[];
  try {
    logFiles = readdirSync(logDir)
      .filter((f) => f.startsWith("conversation-") && f.endsWith(".jsonl"))
      .sort();
  } catch {
    return [];
  }

  const messages: UIMessage[] = [];

  for (const file of logFiles) {
    let content: string;
    try {
      content = readFileSync(join(logDir, file), "utf8");
    } catch {
      continue;
    }

    const lines = content.split("\n").filter(Boolean);
    for (const line of lines) {
      let entry: ConversationLogEntry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }

      if (entry.sessionId !== sessionId) continue;
      if (entry.type !== "message" || !entry.role) continue;

      const text = extractText(entry.content);
      if (text) {
        messages.push({ role: entry.role, text });
      }
    }
  }

  return messages;
}
