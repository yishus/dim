export interface MessageStartEvent {
  role: "user" | "assistant";
}

export interface UserPromptEvent {
  text: string;
  systemPrompt?: string;
}

export interface MessageUpdateEvent {
  text: string;
}

export interface AgentMessageEvent {
  text: string;
}

export interface TokenUsageUpdateEvent {
  cost: number;
  input_tokens: number;
  output_tokens: number;
}

export interface SessionEvents {
  user_prompt: UserPromptEvent;
  message_start: MessageStartEvent;
  message_update: MessageUpdateEvent;
  message_end: void;
  token_usage_update: TokenUsageUpdateEvent;
  agent_update: AgentMessageEvent;
  tool_use: AgentMessageEvent;
}
