import type { SessionInfo } from "../lib/api";

interface SessionListProps {
  dates: string[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  sessions: Record<string, SessionInfo>;
  selectedSessionId: string | null;
  onSelectSession: (id: string) => void;
  onSelectDebug: () => void;
  view: "session" | "debug";
}

function truncateId(id: string): string {
  // e.g. "session-1770889215827-xg4lbgm" → "xg4lbgm"
  const parts = id.split("-");
  return parts.length > 2 ? parts.slice(2).join("-") : id.slice(0, 12);
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function SessionList({
  dates,
  selectedDate,
  onSelectDate,
  sessions,
  selectedSessionId,
  onSelectSession,
  onSelectDebug,
  view,
}: SessionListProps) {
  const sessionEntries = Object.values(sessions);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <h1 className="text-lg font-bold text-zinc-100">Dim Logs</h1>
      </div>

      {/* Date selector */}
      <div className="p-3 border-b border-zinc-800">
        <select
          className="w-full bg-zinc-800 text-zinc-200 text-sm rounded px-2 py-1.5 border border-zinc-700 focus:outline-none focus:border-zinc-500"
          value={selectedDate ?? ""}
          onChange={(e) => onSelectDate(e.target.value)}
        >
          {dates.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {sessionEntries.map((s) => (
          <button
            key={s.sessionId}
            className={`w-full text-left px-4 py-3 border-b border-zinc-800/50 hover:bg-zinc-800/50 transition-colors ${
              selectedSessionId === s.sessionId && view === "session"
                ? "bg-zinc-800 border-l-2 border-l-blue-500"
                : ""
            }`}
            onClick={() => onSelectSession(s.sessionId)}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono text-zinc-300">
                {truncateId(s.sessionId)}
              </span>
              <span className="text-xs text-zinc-500">
                {formatTime(s.startTime)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-zinc-500">
                {s.messageCount} messages
              </span>
              {s.model && (
                <span className="text-xs text-zinc-600 truncate">
                  {s.model}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Debug log button */}
      {selectedDate && (
        <div className="p-3 border-t border-zinc-800">
          <button
            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
              view === "debug"
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
            onClick={onSelectDebug}
          >
            Debug Logs
          </button>
        </div>
      )}
    </div>
  );
}
