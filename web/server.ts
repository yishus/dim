import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

const LOGS_DIR = join(homedir(), ".dim", "logs");
const DIST_DIR = join(import.meta.dir, "dist");
const PUBLIC_FILES: Record<string, string> = {
  "/": join(import.meta.dir, "index.html"),
};

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
};

function getMime(path: string): string {
  const ext = path.slice(path.lastIndexOf("."));
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

interface ConversationEntry {
  timestamp: string;
  sessionId: string;
  type: string;
  role?: string;
  content: unknown;
  metadata?: Record<string, unknown>;
}

interface SessionInfo {
  sessionId: string;
  startTime: string;
  entries: ConversationEntry[];
  messageCount: number;
  model?: string;
  provider?: string;
}

async function listLogDates(): Promise<string[]> {
  try {
    const files = await readdir(LOGS_DIR);
    const dates = new Set<string>();
    for (const f of files) {
      const match = f.match(/(?:conversation|debug)-(\d{4}-\d{2}-\d{2})/);
      if (match?.[1]) dates.add(match[1]);
    }
    return [...dates].sort().reverse();
  } catch {
    return [];
  }
}

async function getConversationLog(
  date: string
): Promise<Record<string, SessionInfo>> {
  const filePath = join(LOGS_DIR, `conversation-${date}.jsonl`);
  try {
    const raw = await readFile(filePath, "utf-8");
    const sessions: Record<string, SessionInfo> = {};

    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line) as ConversationEntry;
        const sid = entry.sessionId;
        if (!sid) continue;

        if (!sessions[sid]) {
          sessions[sid] = {
            sessionId: sid,
            startTime: entry.timestamp,
            entries: [],
            messageCount: 0,
          };
        }

        const session = sessions[sid]!;
        session.entries.push(entry);

        if (entry.type === "message" && entry.role) {
          session.messageCount++;
        }

        if (entry.metadata) {
          if (entry.metadata.model)
            session.model = entry.metadata.model as string;
          if (entry.metadata.provider)
            session.provider = entry.metadata.provider as string;
        }
      } catch {
        // skip malformed lines
      }
    }

    return sessions;
  } catch {
    return {};
  }
}

async function getDebugLog(date: string): Promise<string> {
  const filePath = join(LOGS_DIR, `debug-${date}.log`);
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}

const PORT = parseInt(process.env.PORT ?? "3456", 10);

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // API routes
    if (path === "/api/logs") {
      const dates = await listLogDates();
      return json(dates);
    }

    const logMatch = path.match(/^\/api\/logs\/(\d{4}-\d{2}-\d{2})$/);
    if (logMatch?.[1]) {
      const sessions = await getConversationLog(logMatch[1]);
      return json(sessions);
    }

    const debugMatch = path.match(/^\/api\/debug\/(\d{4}-\d{2}-\d{2})$/);
    if (debugMatch?.[1]) {
      const content = await getDebugLog(debugMatch[1]);
      return json({ content });
    }

    // Static files
    if (PUBLIC_FILES[path]) {
      const file = Bun.file(PUBLIC_FILES[path]);
      return new Response(file, {
        headers: { "Content-Type": getMime(PUBLIC_FILES[path]) },
      });
    }

    // Serve from dist/
    const distPath = join(DIST_DIR, path.slice(1));
    const distFile = Bun.file(distPath);
    if (await distFile.exists()) {
      return new Response(distFile, {
        headers: { "Content-Type": getMime(distPath) },
      });
    }

    // SPA fallback
    const indexFile = Bun.file(PUBLIC_FILES["/"]);
    return new Response(indexFile, {
      headers: { "Content-Type": "text/html" },
    });
  },
});

console.log(`Dim Log Viewer running at http://localhost:${server.port}`);
