import { useEffect, useState } from "react";
import type { Session } from "../session";
import type { UIMessage } from "../types";
import type {
  AgentMessageEvent,
  MessageStartEvent,
  MessageUpdateEvent,
  TokenUsageUpdateEvent,
} from "../types";

export interface TokenUsage {
  cost: number;
  inputTokens: number;
  outputTokens: number;
}

export function useSessionEvents(session: Session) {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>({
    cost: 0,
    inputTokens: 0,
    outputTokens: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const onStart = (event: MessageStartEvent) => {
      setMessages((prev) => [...prev, { role: event.role, text: "" }]);
    };

    const onUpdate = (event: MessageUpdateEvent) => {
      setMessages((prev) => {
        const messages = [...prev];
        const lastMessage = messages.pop();
        if (lastMessage) {
          lastMessage.text += event.text;
          return [...messages, lastMessage];
        }
        return prev;
      });
    };

    const onTokenUsage = (event: TokenUsageUpdateEvent) => {
      setTokenUsage({
        cost: event.cost,
        inputTokens: event.input_tokens,
        outputTokens: event.output_tokens,
      });
    };

    const onAgentUpdate = (event: AgentMessageEvent) => {
      setMessages((prev) => [...prev, { role: "agent", text: event.text }]);
    };

    const onToolUse = (event: AgentMessageEvent) => {
      setMessages((prev) => [...prev, { role: "tool", text: event.text }]);
    };

    const onEnd = () => {
      setIsLoading(false);
    };

    session.eventBus.on("message_start", onStart);
    session.eventBus.on("message_update", onUpdate);
    session.eventBus.on("token_usage_update", onTokenUsage);
    session.eventBus.on("agent_update", onAgentUpdate);
    session.eventBus.on("tool_use", onToolUse);
    session.eventBus.on("message_end", onEnd);

    return () => {
      session.eventBus.off("message_start", onStart);
      session.eventBus.off("message_update", onUpdate);
      session.eventBus.off("token_usage_update", onTokenUsage);
      session.eventBus.off("agent_update", onAgentUpdate);
      session.eventBus.off("tool_use", onToolUse);
      session.eventBus.off("message_end", onEnd);
    };
  }, [session]);

  return { messages, setMessages, tokenUsage, isLoading, setIsLoading };
}
