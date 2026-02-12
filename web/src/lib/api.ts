export interface ConversationEntry {
  timestamp: string;
  sessionId: string;
  type: string;
  role?: string;
  content: unknown;
  metadata?: Record<string, unknown>;
}

export interface SessionInfo {
  sessionId: string;
  startTime: string;
  entries: ConversationEntry[];
  messageCount: number;
  model?: string;
  provider?: string;
}

export async function fetchLogDates(): Promise<string[]> {
  const res = await fetch("/api/logs");
  return res.json();
}

export async function fetchSessions(
  date: string
): Promise<Record<string, SessionInfo>> {
  const res = await fetch(`/api/logs/${date}`);
  return res.json();
}

export async function fetchDebugLog(
  date: string
): Promise<string> {
  const res = await fetch(`/api/debug/${date}`);
  const data = await res.json();
  return data.content;
}
