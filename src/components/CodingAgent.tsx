import { useCallback, useEffect, useRef, useState } from "react";

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
import { useKeyboard } from "@opentui/react";
import ChatTextbox from "./ChatTextbox";
import MessageList from "./MessageList";
import ToolUseRequestDialog from "./ToolUseRequestDialog";
import AskUserQuestionDialog from "./AskUserQuestionDialog";
import ModelSelectorDialog from "./ModelSelectorDialog";
import type { AskUserQuestionInput } from "../tools";
import LoadingIndicator from "./LoadingIndicator";
import StatusBar from "./StatusBar";
import { useSessionEvents } from "../hooks/useSessionEvents";

interface Props {
  session: Session;
  userPrompt: string;
  onExit: () => void;
}

const CodingAgent = (props: Props) => {
  const { session, userPrompt, onExit } = props;

  const extensionCommands = session.extensions.getCommands();
  const allCommands = [
    { name: "/model", description: "Select AI model", value: "model" },
    { name: "/exit", description: "Exit the application", value: "exit" },
    ...extensionCommands.map((cmd) => ({
      name: cmd.name,
      description: cmd.description,
      value: cmd.value,
    })),
  ];

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

  useKeyboard(
    useCallback((key) => {
      if (key.name === "escape" && isLoadingRef.current) {
        session.cancel();
      }
    }, [session]),
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
        role: "assistant",
        text: `Model changed to ${modelName} (${providerName})`,
      },
    ]);
    setShowModelSelector(false);
  };

  const handleModelCancel = () => {
    setShowModelSelector(false);
  };

  const handleSubmit = (submittedText: string) => {
    if (submittedText === "/exit" || submittedText === "exit") {
      onExit();
      return;
    }
    if (submittedText === "/model") {
      setShowModelSelector(true);
      return;
    }
    // Check extension commands
    const extCmd = extensionCommands.find((cmd) => cmd.name === submittedText);
    if (extCmd) {
      extCmd.execute();
      return;
    }
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "user", text: submittedText },
    ]);
    setIsLoading(true);
    session.prompt(submittedText);
  };

  const currentModelName =
    ALL_MODELS.find((m) => m.id === currentModel)?.name ?? "Unknown";
  const currentProviderName = PROVIDER_DISPLAY_NAMES[currentProvider];

  return (
    <box style={{ padding: 1 }}>
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
        {showModelSelector && (
          <ModelSelectorDialog
            currentModel={currentModel}
            onSelect={handleModelSelect}
            onCancel={handleModelCancel}
          />
        )}
        {isLoading && <LoadingIndicator />}
      </scrollbox>
      <ChatTextbox
        onSubmit={handleSubmit}
        commands={allCommands}
        minHeight={6}
      />
      <StatusBar
        providerName={currentProviderName}
        modelName={currentModelName}
        inputTokens={tokenUsage.inputTokens}
        outputTokens={tokenUsage.outputTokens}
        cost={tokenUsage.cost}
      />
    </box>
  );
};

export default CodingAgent;
