import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Session,
  type ToolUseRequest,
  type AskUserQuestionRequest,
  type ModelId,
  type QuestionAnswer,
  ALL_MODELS,
  Provider,
} from "../session";
import { PROVIDER_DISPLAY_NAMES } from "../providers";
import { TextareaRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import MessageList from "./MessageList";
import ToolUseRequestDialog from "./ToolUseRequestDialog";
import AskUserQuestionDialog from "./AskUserQuestionDialog";
import Select from "./Select";
import type { SelectItem } from "./Select";
import type { AskUserQuestionInput } from "../tools";
import LoadingIndicator from "./LoadingIndicator";
import { useSessionEvents } from "../hooks/useSessionEvents";
import { THEME } from "../theme";

interface Props {
  session: Session;
  userPrompt: string;
  onExit: () => void;
}

const LEFT_PANELS = ["status", "steps", "tasks", "tools", "reply"] as const;
type LeftPanel = (typeof LEFT_PANELS)[number];
const PANEL_TITLES: Record<LeftPanel, string> = {
  status: "[1] status",
  steps: "[2] steps",
  tasks: "[3] tasks",
  tools: "[4] tools",
  reply: "[5] reply",
};

const CodingAgent = (props: Props) => {
  const { session, userPrompt, onExit } = props;

  const { messages, setMessages, tokenUsage, isLoading, setIsLoading } =
    useSessionEvents(session);

  const [showToolUseRequest, setShowToolUseRequest] = useState(false);
  const [showAskUserQuestion, setShowAskUserQuestion] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [currentModel, setCurrentModel] = useState<ModelId>(session.getModel());
  const [currentProvider, setCurrentProvider] = useState<Provider>(
    session.getProvider(),
  );
  const toolUseRequestRef = useRef<ToolUseRequest | null>(null);
  const askUserQuestionRef = useRef<AskUserQuestionInput | null>(null);
  const pendingApprovalRef = useRef<{
    resolve: (approved: boolean) => void;
  } | null>(null);
  const pendingAskUserQuestionRef = useRef<{
    resolve: (answers: QuestionAnswer[]) => void;
  } | null>(null);
  const isLoadingRef = useRef(false);
  isLoadingRef.current = isLoading;
  const [activePanel, setActivePanel] = useState<LeftPanel>("reply");
  const [selectedModel, setSelectedModel] = useState(0);
  const [selectedStep, setSelectedStep] = useState(0);
  const textareaRef = useRef<TextareaRenderable>(null);

  const modelItems: SelectItem[] = useMemo(
    () =>
      ALL_MODELS.map((m) => ({
        key: `${m.provider}:${m.id}`,
        label: `${m.name} (${PROVIDER_DISPLAY_NAMES[m.provider]})`,
      })),
    [],
  );

  useKeyboard(
    useCallback(
      (key) => {
        if (key.name === "escape" && isLoadingRef.current) {
          session.cancel();
        }
        // Tab / Shift+Tab to cycle panels
        if (key.name === "tab") {
          setActivePanel((prev) => {
            const idx = LEFT_PANELS.indexOf(prev);
            const next = key.shift
              ? (idx - 1 + LEFT_PANELS.length) % LEFT_PANELS.length
              : (idx + 1) % LEFT_PANELS.length;
            return LEFT_PANELS[next] ?? prev;
          });
        }

        if (key.name === "q") {
          onExit();
        }
      },
      [session],
    ),
  );

  useKeyboard(
    useCallback(
      (key) => {
        // Number keys 1-5 to jump directly
        const num = parseInt(key.name, 10);
        if (activePanel !== "reply" && num >= 1 && num <= LEFT_PANELS.length) {
          const panel = LEFT_PANELS[num - 1];
          if (panel) {
            setActivePanel(panel);
          }
        }
        // Model selector popup controls
        if (showModelSelector) {
          if (key.name === "escape") {
            setShowModelSelector(false);
          } else if (key.name === "return") {
            const selected = modelItems[selectedModel];
            if (selected) {
              const [provider, ...rest] = selected.key.split(":");
              const model = rest.join(":");
              handleModelSelect(model as ModelId, provider as Provider);
            }
          }
          return;
        }
        // "m" in status panel opens model selector
        if (activePanel === "status" && key.name === "m") {
          setShowModelSelector(true);
        }
      },
      [activePanel, showModelSelector, selectedModel, modelItems],
    ),
  );

  useEffect(() => {
    session.toolService.canUseToolHandler = async (request: ToolUseRequest) => {
      toolUseRequestRef.current = request;
      setShowToolUseRequest(true);

      return new Promise<boolean>((resolve) => {
        pendingApprovalRef.current = { resolve };
      });
    };

    session.toolService.askUserQuestionHandler = async (
      request: AskUserQuestionRequest,
    ) => {
      askUserQuestionRef.current = request.input;
      setShowAskUserQuestion(true);

      return new Promise<QuestionAnswer[]>((resolve) => {
        pendingAskUserQuestionRef.current = { resolve };
      });
    };
  }, []);

  useEffect(() => {
    handleSubmit(userPrompt);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setSelectedStep((prev) => {
        const wasAtEnd = prev >= messages.length - 2;
        return wasAtEnd ? messages.length - 1 : prev;
      });
    }
  }, [messages.length]);

  const handleToolUseSelect = (approved: boolean) => {
    pendingApprovalRef.current?.resolve(approved);
    pendingApprovalRef.current = null;
    setShowToolUseRequest(false);
  };

  const handleAskUserQuestionSubmit = (answers: QuestionAnswer[]) => {
    pendingAskUserQuestionRef.current?.resolve(answers);
    pendingAskUserQuestionRef.current = null;
    setShowAskUserQuestion(false);
  };

  const handleAskUserQuestionCancel = () => {
    pendingAskUserQuestionRef.current?.resolve([]);
    pendingAskUserQuestionRef.current = null;
    setShowAskUserQuestion(false);
  };

  const handleModelSelect = (model: ModelId, provider: Provider) => {
    session.setModel(model, provider);
    setCurrentModel(model);
    setCurrentProvider(provider);
    const modelInfo = ALL_MODELS.find((m) => m.id === model);
    const providerName = PROVIDER_DISPLAY_NAMES[provider];
    const modelName = modelInfo?.name ?? model;
    setMessages((prev) => [
      ...prev,
      {
        role: "agent",
        text: `Model changed to ${modelName} (${providerName})`,
      },
    ]);
    setShowModelSelector(false);
  };

  const handleTextareaSubmit = () => {
    const text = textareaRef.current?.plainText?.trim();
    if (!text) return;
    textareaRef.current?.clear();
    handleSubmit(text);
  };

  const handleSubmit = (submittedText: string) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "user", text: submittedText },
    ]);
    setIsLoading(true);
    session.prompt(submittedText);
  };

  const renderStatusKeybindings = () => (
    <box style={{ width: "100%", flexShrink: 0 }}>
      <text>m: Switch model</text>
    </box>
  );

  const renderConversation = () => (
    <scrollbox
      style={{ flexGrow: 1, padding: 1 }}
      stickyScroll={true}
      stickyStart="bottom"
    >
      <MessageList messages={messages} />
      {showToolUseRequest && toolUseRequestRef.current && (
        <ToolUseRequestDialog
          request={toolUseRequestRef.current}
          session={session}
          onSelect={handleToolUseSelect}
        />
      )}
      {showAskUserQuestion && askUserQuestionRef.current && (
        <AskUserQuestionDialog
          input={askUserQuestionRef.current}
          onSubmit={handleAskUserQuestionSubmit}
          onCancel={handleAskUserQuestionCancel}
        />
      )}
      {isLoading && <LoadingIndicator />}
    </scrollbox>
  );

  const renderMessage = () => {
    const msg = messages[selectedStep];
    return (
      <scrollbox style={{ flexGrow: 1, padding: 1 }}>
        {msg ? <MessageList messages={[msg]} /> : null}
      </scrollbox>
    );
  };

  const currentModelName =
    ALL_MODELS.find((m) => m.id === currentModel)?.name ?? "Unknown";
  const currentProviderName = PROVIDER_DISPLAY_NAMES[currentProvider];

  return (
    <box style={{ flexDirection: "column" }} position="relative">
      <box style={{ flexDirection: "row", flexGrow: 1 }}>
        <box style={{ width: "40%", flexDirection: "column" }}>
          <box
            border={true}
            borderStyle="rounded"
            title={PANEL_TITLES.status}
            borderColor={
              activePanel === "status" ? THEME.colors.border.active : undefined
            }
            style={{ flexGrow: 1 }}
          >
            <box style={{ flexDirection: "row" }}>
              <text fg={THEME.colors.text.muted} style={{ marginRight: 1 }}>
                Session
              </text>
              <text fg={THEME.colors.text.primary}>{session.id}</text>
            </box>
            <box style={{ flexDirection: "row" }}>
              <text fg={THEME.colors.text.muted} style={{ marginRight: 1 }}>
                Provider
              </text>
              <text fg={THEME.colors.text.primary}>{currentProviderName}</text>
            </box>
            <box style={{ flexDirection: "row" }}>
              <text fg={THEME.colors.text.muted} style={{ marginRight: 1 }}>
                Model
              </text>
              <text fg={THEME.colors.text.primary}>{currentModelName}</text>
            </box>
            <box style={{ flexDirection: "row" }}>
              <text fg={THEME.colors.text.muted} style={{ marginRight: 1 }}>
                Input Tokens
              </text>
              <text fg={THEME.colors.text.primary}>
                {tokenUsage.inputTokens}
              </text>
            </box>
            <box style={{ flexDirection: "row" }}>
              <text fg={THEME.colors.text.muted} style={{ marginRight: 1 }}>
                Output Tokens
              </text>
              <text fg={THEME.colors.text.primary}>
                {tokenUsage.outputTokens}
              </text>
            </box>
            <box style={{ flexDirection: "row" }}>
              <text fg={THEME.colors.text.muted} style={{ marginRight: 1 }}>
                Total Cost
              </text>
              <text fg={THEME.colors.text.primary}>
                ${tokenUsage.cost.toFixed(6)}
              </text>
            </box>
          </box>
          <box
            border={true}
            borderStyle="rounded"
            title={PANEL_TITLES.steps}
            borderColor={
              activePanel === "steps" ? THEME.colors.border.active : undefined
            }
            style={{
              flexGrow: 1,
              height: activePanel === "steps" ? "80%" : "40%",
            }}
          >
            <Select
              items={messages.map((msg, i) => ({
                key: String(i),
                label: msg.role,
                detail: msg.text.slice(0, 20),
              }))}
              active={activePanel === "steps"}
              selectedIndex={selectedStep}
              onSelectedChange={setSelectedStep}
              emptyText="No steps yet"
            />
          </box>
          <box
            border={true}
            borderStyle="rounded"
            title={PANEL_TITLES.tasks}
            borderColor={
              activePanel === "tasks" ? THEME.colors.border.active : undefined
            }
            style={{ flexGrow: 1, padding: 1 }}
          />
          <box
            border={true}
            borderStyle="rounded"
            title={PANEL_TITLES.tools}
            borderColor={
              activePanel === "tools" ? THEME.colors.border.active : undefined
            }
            style={{ flexGrow: 1, padding: 1 }}
          />
        </box>

        <box style={{ flexGrow: 1, flexDirection: "column" }}>
          <box border={true} borderStyle="rounded" title="conversation">
            {activePanel === "steps" ? renderMessage() : renderConversation()}
          </box>
          <box
            border={true}
            borderStyle="rounded"
            title={PANEL_TITLES.reply}
            borderColor={
              activePanel === "reply" ? THEME.colors.border.active : undefined
            }
            height={5}
            padding={1}
          >
            <textarea
              focused={activePanel === "reply"}
              ref={textareaRef}
              onSubmit={handleTextareaSubmit}
              keyBindings={[
                { name: "return", action: "submit" as const },
                { name: "return", meta: true, action: "newline" as const },
                { name: "return", shift: true, action: "newline" as const },
              ]}
            />
          </box>
        </box>
      </box>
      {activePanel === "status" && renderStatusKeybindings()}
      {showModelSelector && (
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
              borderColor={THEME.colors.border.active}
              title="select model"
              style={{ maxHeight: 10 }}
            >
              <Select
                items={modelItems}
                active={showModelSelector}
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

export default CodingAgent;
