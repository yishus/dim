import { AI, type Message, type MessageParam } from "./ai";
import { Provider } from "./providers";
import tools from "./tools";

export class Agent {
  private context: MessageParam[] = [];

  async *stream(input?: string) {
    if (input) {
      this.context.push(this.nextMessage(input));
    }
    while (true) {
      const { fullMessage, streamText } = AI.stream(
        Provider.Anthropic,
        this.context,
      );

      for await (const event of streamText()) {
        yield event;
      }

      const message = await fullMessage();
      this.context.push(message);
      if (message.content.every((c) => c.type !== "tool_use")) {
        break;
      }
      await this.runToolCalls(message);
    }
  }

  async prompt(input: string) {
    const response = await AI.prompt(Provider.Anthropic, [
      ...this.context,
      this.nextMessage(input),
    ]);
    return { response, text: this.textResponse(response) };
  }

  nextMessage(input: string) {
    return {
      role: "user" as const,
      content: [
        {
          type: "text" as const,
          text: input,
        },
      ],
    };
  }

  textResponse(message: Message) {
    for (const content of message.content) {
      if (content.type === "text") {
        return content.text;
      }
    }
  }

  async runToolCalls(message: Message) {
    const messageToProcess = message;
    let responses = [];
    for (const content of messageToProcess.content) {
      if (content.type === "tool_use") {
        const { id, name, input } = content;
        switch (name) {
          case "read":
            const res = await tools.read.callFunction(
              input as Parameters<typeof tools.read.callFunction>[0],
            );
            responses.push({
              id,
              content: [{ type: "text" as const, text: res }],
            });
        }
      }
    }

    this.context.push({
      role: "user",
      content: responses.map((res) => ({
        type: "tool_result",
        tool_use_id: res.id,
        content: res.content,
      })),
    });
  }
}
