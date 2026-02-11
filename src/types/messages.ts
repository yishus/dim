// Stream delta types
export interface MessageStartDelta {
  type: "message_start";
  role: "user" | "assistant";
}

export interface TextUpdateDelta {
  type: "text_update";
  text: string;
}

export interface IgnoredDelta {
  type: "ignored";
}

export type MessageDelta = MessageStartDelta | TextUpdateDelta | IgnoredDelta;

// Content block types
export interface TextContent {
  type: "text";
  text: string;
  /** Provider-specific metadata (e.g., Google's thinking signatures) */
  metadata?: Record<string, unknown>;
}

export interface ToolUseContent {
  type: "tool_use";
  /** Unique identifier for this tool use. */
  id: string;
  /** Name of the tool being called */
  name: string;
  /** Input arguments for the tool */
  input: unknown;
  /** Provider-specific metadata (e.g., Google's thinking signatures) */
  metadata?: Record<string, unknown>;
}

export interface ToolResultContent {
  type: "tool_result";
  /** ID of the tool_use this is a result for. */
  tool_use_id: string;
  /** Name of the tool */
  name: string;
  /** Result content */
  content: TextContent[];
  /** Whether the tool execution resulted in an error */
  isError?: boolean;
}

export type ContentBlock = TextContent | ToolUseContent;
export type MessageContent = ContentBlock | ToolResultContent;

export interface Message {
  role: "user" | "assistant";
  content: ContentBlock[];
}

export interface MessageParam {
  role: "user" | "assistant";
  content: MessageContent[];
}

export interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

export interface MessageResponse {
  message: Message;
  usage: Usage;
}
