import type { SessionInfo } from "../lib/api";
import { LogEntry } from "./LogEntry";

interface SessionDetailProps {
  session: SessionInfo;
}

export function SessionDetail({ session }: SessionDetailProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
        <div>
          <h2 className="text-sm font-mono text-zinc-300">
            {session.sessionId}
          </h2>
          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
            <span>{new Date(session.startTime).toLocaleString()}</span>
            <span>{session.messageCount} messages</span>
            {session.model && <span>{session.model}</span>}
            {session.provider && <span className="capitalize">{session.provider}</span>}
          </div>
        </div>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {session.entries.map((entry, i) => (
          <LogEntry key={i} entry={entry} />
        ))}
      </div>
    </div>
  );
}
