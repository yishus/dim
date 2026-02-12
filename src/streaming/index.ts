import type {
  MessageDelta,
  MessageResponse,
  StreamResult,
} from "../types";

export interface StreamAdapter {
  toDeltas(providerStream: AsyncIterable<unknown>): AsyncIterable<MessageDelta>;
  toFullMessage(): MessageResponse | Promise<MessageResponse>;
}

export function createStreamResult(
  adapter: StreamAdapter,
  rawStream: AsyncIterable<unknown>,
): StreamResult {
  let resolveStreamComplete: () => void;
  const streamComplete = new Promise<void>((resolve) => {
    resolveStreamComplete = resolve;
  });

  return {
    streamText: async function* () {
      for await (const delta of adapter.toDeltas(rawStream)) {
        yield delta;
      }
      resolveStreamComplete();
    },
    fullMessage: async function () {
      await streamComplete;
      return adapter.toFullMessage();
    },
  };
}
