import { useState } from "react";
import type { ConversationEntry } from "../lib/api";

interface LogEntryProps {
  entry: ConversationEntry;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function syntaxHighlightJson(obj: unknown): string {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(
    /("(?:\\.|[^"\\])*")\s*(:)?|(\b(?:true|false)\b)|(\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match, str: string | undefined, colon: string | undefined, bool: string | undefined, nil: string | undefined, num: string | undefined) => {
      if (str) {
        if (colon) return `<span class="json-key">${str}</span>:`;
        return `<span class="json-string">${str}</span>`;
      }
      if (bool) return `<span class="json-boolean">${match}</span>`;
      if (nil) return `<span class="json-null">${match}</span>`;
      if (num) return `<span class="json-number">${match}</span>`;
      return match;
    }
  );
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === "object" && block !== null && "text" in block) {
          return (block as { text: string }).text;
        }
        if (typeof block === "object" && block !== null && "type" in block) {
          return `[${(block as { type: string }).type}]`;
        }
        return String(block);
      })
      .join("\n");
  }
  if (typeof content === "object" && content !== null) {
    if ("text" in content) return (content as { text: string }).text;
    if ("type" in content) {
      const typed = content as { type: string; sessionId?: string };
      if (typed.type === "session_start") {
        return `Session started: ${typed.sessionId ?? ""}`;
      }
      return `[${typed.type}]`;
    }
  }
  return String(content);
}

function CollapsibleJson({ data, label }: { data: unknown; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
        onClick={() => setOpen(!open)}
      >
        <span className={`transition-transform ${open ? "rotate-90" : ""}`}>
          ▶
        </span>
        {label}
      </button>
      {open && (
        <pre
          className="mt-2 p-3 bg-zinc-900 rounded text-xs overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: syntaxHighlightJson(data) }}
        />
      )}
    </div>
  );
}

function MessageEntry({ entry }: { entry: ConversationEntry }) {
  const isUser = entry.role === "user";
  const text = extractTextContent(entry.content);

  return (
    <div className={`flex ${isUser ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[75%] rounded-lg px-4 py-3 ${
          isUser
            ? "bg-zinc-800 text-zinc-200"
            : "bg-blue-900/40 text-blue-100"
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium uppercase text-zinc-400">
            {entry.role}
          </span>
          <span className="text-xs text-zinc-600">
            {formatTime(entry.timestamp)}
          </span>
        </div>
        <div className="text-sm whitespace-pre-wrap">{text}</div>
        {entry.metadata && (
          <CollapsibleJson data={entry.metadata} label="metadata" />
        )}
      </div>
    </div>
  );
}

function ToolCallEntry({ entry }: { entry: ConversationEntry }) {
  const [open, setOpen] = useState(false);
  const content = entry.content as Record<string, unknown>;
  const toolName = (content.name as string) ?? "unknown tool";

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-4 py-2 bg-zinc-900/80 hover:bg-zinc-800/80 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <span
          className={`text-xs transition-transform ${open ? "rotate-90" : ""}`}
        >
          ▶
        </span>
        <span className="text-xs font-mono text-amber-400">{toolName}</span>
        <span className="text-xs text-zinc-500 ml-auto">
          {formatTime(entry.timestamp)}
        </span>
      </button>
      {open && (
        <div className="p-4 border-t border-zinc-800">
          <pre
            className="text-xs overflow-x-auto bg-zinc-950 p-3 rounded"
            dangerouslySetInnerHTML={{
              __html: syntaxHighlightJson(content.input ?? content),
            }}
          />
        </div>
      )}
    </div>
  );
}

function ToolResultEntry({ entry }: { entry: ConversationEntry }) {
  const [open, setOpen] = useState(false);
  const content = entry.content as Record<string, unknown>;
  const isError = content.is_error === true || content.isError === true;

  return (
    <div
      className={`border rounded-lg overflow-hidden ${
        isError ? "border-red-900/50" : "border-zinc-800"
      }`}
    >
      <button
        className="w-full flex items-center gap-2 px-4 py-2 bg-zinc-900/80 hover:bg-zinc-800/80 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <span
          className={`text-xs transition-transform ${open ? "rotate-90" : ""}`}
        >
          ▶
        </span>
        <span
          className={`text-xs font-medium ${isError ? "text-red-400" : "text-green-400"}`}
        >
          {isError ? "Error" : "Result"}
        </span>
        <span className="text-xs text-zinc-500 ml-auto">
          {formatTime(entry.timestamp)}
        </span>
      </button>
      {open && (
        <div className="p-4 border-t border-zinc-800">
          <pre className="text-xs overflow-x-auto bg-zinc-950 p-3 rounded whitespace-pre-wrap">
            {typeof content.result === "string"
              ? content.result
              : JSON.stringify(content.result ?? content, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function SummaryEntry({ entry }: { entry: ConversationEntry }) {
  const content = entry.content as Record<string, unknown>;
  return (
    <div className="flex justify-center">
      <div className="bg-zinc-800/50 rounded-full px-4 py-1.5 text-xs text-zinc-400 flex items-center gap-2">
        <span>Context summarized</span>
        {content.tokensBefore && content.tokensAfter && (
          <span className="text-zinc-500">
            {String(content.tokensBefore)} → {String(content.tokensAfter)} tokens
          </span>
        )}
        <span className="text-zinc-600">{formatTime(entry.timestamp)}</span>
      </div>
    </div>
  );
}

export function LogEntry({ entry }: LogEntryProps) {
  switch (entry.type) {
    case "message":
      return <MessageEntry entry={entry} />;
    case "tool_call":
      return <ToolCallEntry entry={entry} />;
    case "tool_result":
      return <ToolResultEntry entry={entry} />;
    case "summary":
      return <SummaryEntry entry={entry} />;
    default:
      return (
        <div className="text-xs text-zinc-600 p-2">
          Unknown entry type: {entry.type}
        </div>
      );
  }
}
