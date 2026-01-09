import { AI, type Message, type MessageDelta } from "./ai";
import { EventBus } from "./event-bus";
import { Provider } from "./providers";

interface SessionOptions {
  eventBus: EventBus;
}

export interface UIMessage {
  role: "user" | "assistant";
  text: string;
}

export class Session {
  context: Message[] = [];
  eventBus: EventBus;

  constructor(options: SessionOptions) {
    this.eventBus = options.eventBus;
  }

  async prompt(input: string) {
    const nextMesage: Message = {
      role: "user",
      content: {
        type: "text",
        text: input,
      },
    };
    const stream = AI.stream(Provider.Anthropic, [...this.context, nextMesage]);
    for await (const event of stream) {
      this.processDelta(event);
    }
  }

  processDelta(delta: MessageDelta) {
    if (delta.type === "message_start") {
      this.eventBus.emit("message_start", { role: delta.role });
    }

    if (delta.type == "text_start" || delta.type == "text_update") {
      this.eventBus.emit("message_update", { text: delta.text });
    }

    if (delta.type === "text_end") {
      this.eventBus.emit("message_end");
    }
  }
}
