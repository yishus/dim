import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { existsSync, readFileSync } from "fs";
import { basename, dirname } from "path";

import {
  Session,
  type ToolUseRequest,
  type AskUserQuestionRequest,
  type ModelId,
  type QuestionAnswer,
  type UIMessage,
  ALL_MODELS,
  Provider,
} from "../session";
import { PROVIDER_DISPLAY_NAMES } from "../providers";
import { SyntaxStyle, TextareaRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import MessageList from "./MessageList";
import ToolUseRequestDialog from "./ToolUseRequestDialog";
import AskUserQuestionDialog from "./AskUserQuestionDialog";
import Select from "./Select";
import TabbedPanel from "./TabbedPanel";
import type { SelectItem } from "./Select";
import type { AskUserQuestionInput } from "../tools";
import LoadingIndicator from "./LoadingIndicator";
import { useSessionEvents } from "../hooks/useSessionEvents";
import { githubDark, THEME } from "../theme";

interface Props {
  session: Session;
  onExit: () => void;
}

const LEFT_PANELS = ["status", "steps", "skills", "reply"] as const;
type LeftPanel = (typeof LEFT_PANELS)[number];
const PANEL_TITLES: Record<LeftPanel, string> = {
  status: "[1] status",
  steps: "[2] steps",
  skills: "[3] skills",
  reply: "[4] reply",
};

const formatStepDetail = (text: string) =>
  text.replace(/\s+/g, " ").trim().slice(0, 20);

const CodingAgent = (props: Props) => {
  const { session, onExit } = props;

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
  const [selectedExtension, setSelectedExtension] = useState(0);
  const [expandedPromptSteps, setExpandedPromptSteps] = useState<number[]>([]);
  const textareaRef = useRef<TextareaRenderable>(null);
  const [stepsTab, setStepsTab] = useState("steps");
  const [skillsTab, setSkillsTab] = useState("skills");

  const modelItems: SelectItem[] = useMemo(
    () =>
      ALL_MODELS.map((m) => ({
        key: `${m.provider}:${m.id}`,
        label: `${m.name} (${PROVIDER_DISPLAY_NAMES[m.provider]})`,
      })),
    [],
  );
  const extensionItems: SelectItem[] = useMemo(
    () =>
      session.extensions.getLoadedExtensions().map((extension) => ({
        key: extension.path,
        label: extension.name,
        detail: extension.path.endsWith("/index.ts")
          ? basename(dirname(extension.path))
          : basename(extension.path),
      })),
    [session],
  );
  const selectedExtensionItem = extensionItems[selectedExtension];
  const selectedExtensionPath = selectedExtensionItem?.key;
  const codeSyntaxStyle = useMemo(
    () => SyntaxStyle.fromStyles(githubDark),
    [],
  );
  const stepMessages = useMemo<UIMessage[]>(() => messages, [messages]);
  const selectedStepMessage = stepMessages[selectedStep];
  const selectedStepHasPrompt =
    selectedStepMessage?.role === "user" && "systemPrompt" in selectedStepMessage;
  const isSelectedStepPromptExpanded =
    selectedStepHasPrompt && expandedPromptSteps.includes(selectedStep);
  const selectedExtensionSource = useMemo(() => {
    if (!selectedExtensionPath) return null;
    if (!existsSync(selectedExtensionPath)) {
      return `Extension file not found:\n${selectedExtensionPath}`;
    }

    try {
      return readFileSync(selectedExtensionPath, "utf8");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `Failed to read extension source:\n${selectedExtensionPath}\n\n${message}`;
    }
  }, [selectedExtensionPath]);

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

        if (
          activePanel === "steps" &&
          key.name === "p" &&
          selectedStepMessage?.role === "user" &&
          "systemPrompt" in selectedStepMessage
        ) {
          setExpandedPromptSteps((prev) =>
            prev.includes(selectedStep)
              ? prev.filter((index) => index !== selectedStep)
              : [...prev, selectedStep],
          );
        }
      },
      [activePanel, showModelSelector, selectedModel, modelItems, selectedStep, selectedStepMessage],
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
    if (stepMessages.length > 0) {
      setSelectedStep((prev) => {
        const wasAtEnd = prev >= stepMessages.length - 2;
        return wasAtEnd ? stepMessages.length - 1 : prev;
      });
    }
  }, [stepMessages.length]);

  useEffect(() => {
    setSelectedExtension((prev) =>
      extensionItems.length === 0
        ? 0
        : Math.min(prev, extensionItems.length - 1),
    );
  }, [extensionItems]);

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
    setIsLoading(true);
    session.prompt(submittedText);
  };

  const renderStatusKeybindings = () => (
    <box
      style={{
        width: "100%",
        flexShrink: 0,
        flexDirection: "row",
      }}
    >
      <text>m: Switch model</text>
    </box>
  );

  const renderConversation = () => (
    <box
      style={{
        flexGrow: 1,
        flexShrink: 1,
        flexDirection: "column",
        minWidth: 0,
        minHeight: 0,
      }}
    >
      {messages.length === 0 ? (
        <box
          style={{
            flexGrow: 1,
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ascii-font font="tiny" text="dim" />
        </box>
      ) : (
        <scrollbox
          style={{ flexGrow: 1, flexShrink: 1, padding: 1, minWidth: 0 }}
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
      )}
    </box>
  );

  const renderMessage = () => {
    const msg = selectedStepMessage;
    return (
      <scrollbox
        style={{ flexGrow: 1, flexShrink: 1, padding: 1, minWidth: 0 }}
      >
        {msg ? (
          <box style={{ flexDirection: "column", minWidth: 0 }}>
            {msg.role === "user" && "systemPrompt" in msg && (
              <box
                style={{
                  flexDirection: "column",
                  marginBottom: 1,
                  minWidth: 0,
                }}
              >
                <text fg={THEME.colors.text.muted}>
                  {isSelectedStepPromptExpanded
                    ? "p: hide system prompt"
                    : "p: show system prompt"}
                </text>
                {isSelectedStepPromptExpanded && (
                  msg.systemPrompt ? (
                    <MessageList
                      messages={[
                        {
                          role: "system",
                          text: msg.systemPrompt,
                        },
                      ]}
                    />
                  ) : (
                    <box
                      border={["left"]}
                      borderColor={THEME.colors.text.muted}
                      style={{ marginTop: 1, paddingLeft: 1 }}
                    >
                      <text fg={THEME.colors.text.muted}>
                        No system prompt for this request.
                      </text>
                    </box>
                  )
                )}
              </box>
            )}
            <MessageList messages={[msg]} />
          </box>
        ) : null}
      </scrollbox>
    );
  };

  const renderExtensionPreview = () => (
    <scrollbox
      style={{ flexGrow: 1, flexShrink: 1, padding: 1, minWidth: 0 }}
    >
      {selectedExtensionPath ? (
        <box style={{ flexDirection: "column", minWidth: 0 }}>
          <text fg={THEME.colors.text.muted}>{selectedExtensionPath}</text>
          <code
            content={selectedExtensionSource ?? ""}
            filetype="typescript"
            syntaxStyle={codeSyntaxStyle}
          />
        </box>
      ) : (
        <text fg={THEME.colors.text.muted}>No extension selected</text>
      )}
    </scrollbox>
  );

  const currentModelName =
    ALL_MODELS.find((m) => m.id === currentModel)?.name ?? "Unknown";
  const currentProviderName = PROVIDER_DISPLAY_NAMES[currentProvider];
  const isShowingExtensionPreview =
    activePanel === "skills" && skillsTab === "extensions";
  const rightPanelTitle = isShowingExtensionPreview
    ? selectedExtensionItem?.label
      ? `extension: ${selectedExtensionItem.label}`
      : "extension"
    : "conversation";

  return (
    <box
      width="100%"
      height="100%"
      style={{ flexDirection: "column" }}
      position="relative"
    >
      <box
        width="100%"
        height="100%"
        style={{ flexDirection: "row", flexGrow: 1, minHeight: 0 }}
      >
        <box
          style={{
            width: "30%",
            flexDirection: "column",
            flexShrink: 0,
            minHeight: 0,
          }}
        >
          <box
            border={true}
            borderStyle="rounded"
            title={PANEL_TITLES.status}
            borderColor={
              activePanel === "status" ? THEME.colors.border.active : undefined
            }
            style={{ flexGrow: 0, flexShrink: 0 }}
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
          <TabbedPanel
            shortcutKey="2"
            tabs={[
              { key: "steps", label: "steps" },
              { key: "tasks", label: "tasks" },
            ]}
            active={activePanel === "steps"}
            activeTab={stepsTab}
            onTabChange={setStepsTab}
          >
            {stepsTab == "steps" && (
              <Select
                items={stepMessages.map((msg, i) => ({
                  key: String(i),
                  label: msg.role,
                  detail: formatStepDetail(msg.text),
                }))}
                active={activePanel === "steps"}
                selectedIndex={selectedStep}
                onSelectedChange={setSelectedStep}
                emptyText="No steps yet"
              />
            )}
            {stepsTab == "tasks" && <></>}
          </TabbedPanel>
          <TabbedPanel
            shortcutKey="3"
            tabs={[
              { key: "skills", label: "skills" },
              { key: "extensions", label: "extensions" },
            ]}
            active={activePanel === "skills"}
            activeTab={skillsTab}
            onTabChange={setSkillsTab}
            style={{ minHeight: 10 }}
          >
            {skillsTab == "skills" && <></>}
            {skillsTab == "extensions" && (
              <Select
                items={extensionItems}
                active={activePanel === "skills"}
                selectedIndex={selectedExtension}
                onSelectedChange={setSelectedExtension}
                emptyText="No extensions loaded"
              />
            )}
          </TabbedPanel>
        </box>
        <box
          style={{
            flexGrow: 1,
            flexShrink: 1,
            flexDirection: "column",
            minWidth: 0,
            minHeight: 0,
          }}
        >
          <box
            border={true}
            borderStyle="rounded"
            title={rightPanelTitle}
            style={{ flexGrow: 1, flexDirection: "column", minHeight: 0 }}
          >
            {activePanel === "steps"
              ? renderMessage()
              : isShowingExtensionPreview
                ? renderExtensionPreview()
                : renderConversation()}
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
              />
            </box>
          </box>
        </box>
      )}
    </box>
  );
};

export default CodingAgent;
