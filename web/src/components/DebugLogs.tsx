import { useState, useEffect } from "react";
import { fetchDebugLog } from "../lib/api";

interface DebugLogsProps {
  date: string;
}

interface ParsedLine {
  raw: string;
  level: string;
  component: string;
  message: string;
  timestamp: string;
}

function parseLine(line: string): ParsedLine {
  const match = line.match(
    /^\[(.+?)\]\s+\[(\w+)\]\s+\[(.+?)\]\s+(.*)$/
  );
  if (match) {
    return {
      raw: line,
      timestamp: match[1]!,
      level: match[2]!,
      component: match[3]!,
      message: match[4]!,
    };
  }
  return { raw: line, level: "", component: "", message: line, timestamp: "" };
}

const LEVEL_COLORS: Record<string, string> = {
  DEBUG: "text-zinc-500",
  INFO: "text-blue-400",
  WARN: "text-yellow-400",
  ERROR: "text-red-400",
};

export function DebugLogs({ date }: DebugLogsProps) {
  const [content, setContent] = useState("");
  const [filter, setFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("ALL");

  useEffect(() => {
    fetchDebugLog(date).then(setContent);
  }, [date]);

  const lines = content
    .split("\n")
    .filter((l) => l.trim())
    .map(parseLine);

  const filtered = lines.filter((l) => {
    if (levelFilter !== "ALL" && l.level !== levelFilter) return false;
    if (filter && !l.raw.toLowerCase().includes(filter.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
        <h2 className="text-sm font-medium text-zinc-300">
          Debug Logs — {date}
        </h2>
        <div className="flex items-center gap-2 ml-auto">
          <select
            className="bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          >
            <option value="ALL">All Levels</option>
            <option value="DEBUG">DEBUG</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
          </select>
          <input
            type="text"
            placeholder="Filter..."
            className="bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 w-48 focus:outline-none focus:border-zinc-500"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Log lines */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
        {filtered.length === 0 ? (
          <div className="text-zinc-600 text-center py-8">No log entries</div>
        ) : (
          filtered.map((line, i) => (
            <div key={i} className="py-0.5 flex gap-2 hover:bg-zinc-900/50">
              {line.timestamp && (
                <span className="text-zinc-600 flex-shrink-0">
                  {line.timestamp}
                </span>
              )}
              {line.level && (
                <span
                  className={`w-12 flex-shrink-0 ${LEVEL_COLORS[line.level] ?? "text-zinc-400"}`}
                >
                  {line.level}
                </span>
              )}
              {line.component && (
                <span className="text-zinc-500 flex-shrink-0">
                  [{line.component}]
                </span>
              )}
              <span className="text-zinc-300">{line.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
