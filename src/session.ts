import { AI } from "./ai";
import { EventBus } from "./event-bus";

interface SessionOptions {
  eventBus: EventBus;
}

export class Session {
  messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  eventBus: EventBus;

  constructor(options: SessionOptions) {
    this.eventBus = options.eventBus;
  }

  async prompt(input: string) {
    const stream = AI.stream(input);
    for await (const event of stream) {
      this.eventBus.emit("sessionStream", event);
    }
  }
}
