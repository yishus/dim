export interface MessageStartEvent {
  role: "user" | "assistant";
}

export interface MessageUpdateEvent {
  text: string;
}

export interface TokenUsageUpdateEvent {
  cost: number;
  input_tokens: number;
  output_tokens: number;
}

export interface SessionEvents {
  message_start: MessageStartEvent;
  message_update: MessageUpdateEvent;
  message_end: void;
  token_usage_update: TokenUsageUpdateEvent;
}
