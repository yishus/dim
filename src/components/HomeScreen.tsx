import { useMemo, useRef, useState } from "react";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { useKeyboard } from "@opentui/react";
import { SyntaxStyle, TextareaRenderable } from "@opentui/core";
import { githubDark, THEME } from "../theme";
import {
  getRecentSessions,
  getSessionMessages,
} from "../services/session-history";
import { AVAILABLE_ANTHROPIC_MODELS } from "../providers/anthropic";
import { AVAILABLE_GOOGLE_MODELS } from "../providers/google";
import { AVAILABLE_OPENAI_MODELS } from "../providers/openai";
import MessageList from "./MessageList";
import Select from "./Select";
import type { SelectItem } from "./Select";

const LEFT_PANELS = ["status", "sessions", "memory", "extensions"] as const;
type LeftPanel = (typeof LEFT_PANELS)[number];
const PANEL_TITLES: Record<LeftPanel, string> = {
  status: "[1] status",
  sessions: "[2] sessions",
  memory: "[3] memory",
  extensions: "[4] extensions",
};

const MEMORY_FILES = ["CLAUDE.md", "AGENTS.md"] as const;
const EXTENSION_DIRS = [
  join(homedir(), ".dim", "extensions"),
  join(process.cwd(), ".dim", "extensions"),
];

interface ExtensionEntry {
  name: string;
  indexPath: string;
}

function discoverExtensions(): ExtensionEntry[] {
  const extensions: ExtensionEntry[] = [];
  const seen = new Set<string>();

  for (const dir of EXTENSION_DIRS) {
    if (!existsSync(dir)) continue;
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || seen.has(entry.name)) continue;
        const indexPath = join(dir, entry.name, "index.ts");
        if (!existsSync(indexPath)) continue;
        seen.add(entry.name);
        extensions.push({ name: entry.name, indexPath });
      }
    } catch {
      continue;
    }
  }

  return extensions;
}
const defaultSyntaxStyle = SyntaxStyle.fromStyles(githubDark);

interface Props {
  initialPromptSubmitted: (
    prompt: string,
    modelId: string,
  ) => void | Promise<void>;
  onExit: () => void;
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const HomeScreen = (props: Props) => {
  const sessions = useMemo(() => getRecentSessions(10), []);
  const [activePanel, setActivePanel] = useState<LeftPanel>("status");
  const [selectedSession, setSelectedSession] = useState(0);
  const [selectedMemory, setSelectedMemory] = useState(0);
  const [selectedExtension, setSelectedExtension] = useState(0);
  const [showChatPopup, setShowChatPopup] = useState(false);
  const [popupFocus, setPopupFocus] = useState<"prompt" | "model">("prompt");
  const [selectedModel, setSelectedModel] = useState(0);
  const textareaRef = useRef<TextareaRenderable>(null);

  const allModels: SelectItem[] = useMemo(() => {
    const items: SelectItem[] = [];
    for (const m of AVAILABLE_ANTHROPIC_MODELS) {
      items.push({
        key: m.id,
        label: m.name,
      });
    }
    for (const m of AVAILABLE_GOOGLE_MODELS) {
      items.push({ key: m.id, label: m.name });
    }
    for (const m of AVAILABLE_OPENAI_MODELS) {
      items.push({ key: m.id, label: m.name });
    }
    return items;
  }, []);

  const memoryFiles = useMemo(() => {
    const cwd = process.cwd();
    return MEMORY_FILES.filter((f) => existsSync(join(cwd, f)));
  }, []);

  const extensions = useMemo(() => discoverExtensions(), []);

  const sessionItems: SelectItem[] = useMemo(
    () =>
      sessions.map((s) => ({
        key: s.sessionId,
        label: s.title,
        detail: formatDate(s.lastActivity),
      })),
    [sessions],
  );

  const memoryItems: SelectItem[] = useMemo(
    () => memoryFiles.map((f) => ({ key: f, label: f })),
    [memoryFiles],
  );

  const extensionItems: SelectItem[] = useMemo(
    () => extensions.map((ext) => ({ key: ext.name, label: ext.name })),
    [extensions],
  );

  useKeyboard((key) => {
    if (key.name === "q") {
      props.onExit();
      return;
    }
    if (showChatPopup) {
      if (key.name === "escape") {
        setShowChatPopup(false);
      } else if (key.name === "tab") {
        setPopupFocus((f) => (f === "prompt" ? "model" : "prompt"));
      } else if (key.name === "return" && !key.meta && !key.shift) {
        handleChatSubmit();
      }
      return;
    }
    if (key.name === "a") {
      setShowChatPopup(true);
      setPopupFocus("prompt");
      return;
    }
    if (key.name === "tab") {
      setActivePanel((current) => {
        const idx = LEFT_PANELS.indexOf(current);
        return LEFT_PANELS[(idx + 1) % LEFT_PANELS.length]!;
      });
    }
    const numKey = parseInt(key.name);
    if (numKey >= 1 && numKey <= LEFT_PANELS.length) {
      setActivePanel(LEFT_PANELS[numKey - 1]!);
    }
  });

  const renderStatus = () => (
    <box
      style={{ width: "65%", flexDirection: "column", alignItems: "center" }}
      border={true}
      borderStyle="rounded"
      title="status"
    >
      <box style={{ height: "30%" }} />
      <ascii-font font="tiny" text="dim" />
    </box>
  );

  const selectedSessionData = sessions[selectedSession];
  const sessionMessages = useMemo(
    () =>
      selectedSessionData
        ? getSessionMessages(selectedSessionData.sessionId)
        : [],
    [selectedSessionData?.sessionId],
  );

  const renderSessions = () => (
    <box
      style={{ width: "65%", flexDirection: "column" }}
      border={true}
      borderStyle="rounded"
      title="session"
    >
      <scrollbox>
        <MessageList messages={sessionMessages} />
      </scrollbox>
    </box>
  );

  const selectedMemoryFile = memoryFiles[selectedMemory];
  const memoryContent = useMemo(() => {
    if (!selectedMemoryFile) return "";
    try {
      return readFileSync(join(process.cwd(), selectedMemoryFile), "utf8");
    } catch {
      return "";
    }
  }, [selectedMemoryFile]);

  const renderMemory = () => (
    <box
      style={{ width: "65%", flexDirection: "column" }}
      border={true}
      borderStyle="rounded"
      title="memory"
    >
      <scrollbox>
        <markdown content={memoryContent} syntaxStyle={defaultSyntaxStyle} />
      </scrollbox>
    </box>
  );

  const selectedExtensionData = extensions[selectedExtension];
  const extensionContent = useMemo(() => {
    if (!selectedExtensionData) return "";
    try {
      return readFileSync(selectedExtensionData.indexPath, "utf8");
    } catch {
      return "";
    }
  }, [selectedExtensionData?.indexPath]);

  const renderExtensions = () => (
    <box
      style={{ width: "65%", flexDirection: "column" }}
      border={true}
      borderStyle="rounded"
      title={selectedExtensionData?.name ?? "extension"}
    >
      <scrollbox>
        <code
          content={extensionContent}
          filetype="typescript"
          syntaxStyle={defaultSyntaxStyle}
        />
      </scrollbox>
    </box>
  );

  const renderStatusKeybindings = () => (
    <box style={{ width: "100%", flexShrink: 0 }}>
      <text>New session: a</text>
    </box>
  );

  const renderSessionKeybindings = () => (
    <box style={{ width: "100%", flexDirection: "row", flexShrink: 0 }}>
      <text>New session: a</text>
    </box>
  );

  const renderMemoryKeybindings = () => (
    <box style={{ width: "100%", flexShrink: 0 }}>
      <text>New session: a</text>
    </box>
  );

  const renderExtensionsKeybindings = () => (
    <box style={{ width: "100%", flexShrink: 0 }}>
      <text>New session: a</text>
    </box>
  );

  const handleChatSubmit = () => {
    const text = textareaRef.current?.plainText?.trim();
    if (!text) return;
    const modelId = allModels[selectedModel]?.key ?? allModels[0]!.key;
    textareaRef.current?.clear();
    setShowChatPopup(false);
    props.initialPromptSubmitted(text, modelId);
  };

  return (
    <box style={{ flexGrow: 1, flexDirection: "column" }} position="relative">
      <box style={{ flexGrow: 1, flexDirection: "row" }}>
        <box style={{ width: "35%", flexDirection: "column" }}>
          <box
            border={true}
            borderStyle="rounded"
            borderColor={
              activePanel === "status" ? THEME.colors.border.active : undefined
            }
            title={PANEL_TITLES.status}
            style={{ flexDirection: "column", flexShrink: 0 }}
          >
            <text fg={THEME.colors.text.muted}>
              {process.cwd().replace(homedir(), "~")}
            </text>
          </box>

          <box
            border={true}
            borderStyle="rounded"
            borderColor={
              activePanel === "sessions"
                ? THEME.colors.border.active
                : undefined
            }
            title={PANEL_TITLES.sessions}
          >
            <Select
              items={sessionItems}
              active={activePanel === "sessions" && !showChatPopup}
              selectedIndex={selectedSession}
              onSelectedChange={setSelectedSession}
              emptyText="No sessions yet"
            />
          </box>

          <box
            border={true}
            borderStyle="rounded"
            borderColor={
              activePanel === "memory" ? THEME.colors.border.active : undefined
            }
            title={PANEL_TITLES.memory}
          >
            <Select
              items={memoryItems}
              active={activePanel === "memory" && !showChatPopup}
              selectedIndex={selectedMemory}
              onSelectedChange={setSelectedMemory}
              emptyText="No memory files found"
            />
          </box>

          <box
            border={true}
            borderStyle="rounded"
            borderColor={
              activePanel === "extensions"
                ? THEME.colors.border.active
                : undefined
            }
            title={PANEL_TITLES.extensions}
          >
            <Select
              items={extensionItems}
              active={activePanel === "extensions" && !showChatPopup}
              selectedIndex={selectedExtension}
              onSelectedChange={setSelectedExtension}
              emptyText="No extensions found"
            />
          </box>
        </box>

        {activePanel === "status" && renderStatus()}
        {activePanel === "sessions" && renderSessions()}
        {activePanel === "memory" && renderMemory()}
        {activePanel === "extensions" && renderExtensions()}
      </box>

      {activePanel === "status" && renderStatusKeybindings()}
      {activePanel === "sessions" && renderSessionKeybindings()}
      {activePanel === "memory" && renderMemoryKeybindings()}
      {activePanel === "extensions" && renderExtensionsKeybindings()}

      {showChatPopup && (
        <box
          position="absolute"
          left={0}
          top={0}
          width="100%"
          height="100%"
          justifyContent="center"
          alignItems="center"
        >
          <box backgroundColor="#000000" width="60%">
            <box
              border={true}
              borderStyle="rounded"
              borderColor={
                popupFocus === "prompt" ? THEME.colors.border.active : undefined
              }
              padding={1}
              marginBottom={1}
              title="new session prompt"
            >
              <textarea
                ref={textareaRef}
                focused={popupFocus === "prompt"}
                keyBindings={[
                  { name: "return", meta: true, action: "newline" as const },
                  { name: "return", shift: true, action: "newline" as const },
                ]}
              />
            </box>
            <box
              border={true}
              borderStyle="rounded"
              borderColor={
                popupFocus === "model" ? THEME.colors.border.active : undefined
              }
              title="model"
              style={{ maxHeight: 5 }}
            >
              <Select
                items={allModels}
                active={popupFocus === "model"}
                selectedIndex={selectedModel}
                onSelectedChange={setSelectedModel}
                emptyText="No models"
                persistSelection
              />
            </box>
          </box>
        </box>
      )}
    </box>
  );
};

export default HomeScreen;
