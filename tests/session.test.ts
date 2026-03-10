import { describe, expect, it, mock } from "bun:test";

import { Session } from "../src/session";
import { Provider } from "../src/types";

function createSessionForTest(overriddenSystemPrompt?: string) {
  const session = new (Session as unknown as { new (): Session })();
  const runHook = mock(async () =>
    overriddenSystemPrompt === undefined
      ? {}
      : { systemPrompt: overriddenSystemPrompt },
  );
  const userPromptEvents: Array<{ text: string; systemPrompt?: string }> = [];

  session.logger = {
    info() {},
    error() {},
    debug() {},
  } as any;
  session.extensions = {
    runHook,
  } as any;
  session.toolService = {
    requestToolApproval: mock(async () => true),
    askUserQuestion: mock(async () => []),
  } as any;
  session.fileMemory = {
    save: mock(async () => {}),
  } as any;

  session.eventBus.on("user_prompt", (event) => {
    userPromptEvents.push(event);
  });

  let streamCalls = 0;
  let lastStreamOptions: any;
  session.agent = {
    model: "claude-sonnet-4-20250514",
    provider: Provider.Anthropic,
    systemPrompt: "original system prompt",
    stream(_input: string, options: unknown) {
      streamCalls += 1;
      lastStreamOptions = options;
      return (async function* () {})();
    },
  } as any;

  return {
    session,
    runHook,
    getStreamCalls: () => streamCalls,
    getLastStreamOptions: () => lastStreamOptions,
    getUserPromptEvents: () => userPromptEvents,
  };
}

describe("Session.prompt", () => {
  it("applies a system prompt override from UserPromptSubmit", async () => {
    const {
      session,
      runHook,
      getStreamCalls,
      getLastStreamOptions,
      getUserPromptEvents,
    } =
      createSessionForTest("overridden prompt");

    await session.prompt("hello");

    expect(runHook).toHaveBeenCalledWith("UserPromptSubmit", {
      input: {
        model: "claude-sonnet-4-20250514",
        provider: Provider.Anthropic,
        systemPrompt: "original system prompt",
      },
    });
    expect(getLastStreamOptions().systemPrompt).toBe("overridden prompt");
    expect(getUserPromptEvents()).toEqual([
      { text: "hello", systemPrompt: "overridden prompt" },
    ]);
    expect(session.agent.systemPrompt).toBe("original system prompt");
    expect(getStreamCalls()).toBe(1);
  });

  it("does not overwrite the system prompt when the hook omits the key", async () => {
    const { session, getLastStreamOptions, getUserPromptEvents } =
      createSessionForTest();

    await session.prompt("hello");

    expect("systemPrompt" in getLastStreamOptions()).toBe(false);
    expect(getUserPromptEvents()).toEqual([
      { text: "hello", systemPrompt: "original system prompt" },
    ]);
    expect(session.agent.systemPrompt).toBe("original system prompt");
  });

  it("accepts an empty string override", async () => {
    const { session, getLastStreamOptions, getUserPromptEvents } =
      createSessionForTest("");

    await session.prompt("hello");

    expect(getLastStreamOptions().systemPrompt).toBe("");
    expect(getUserPromptEvents()).toEqual([{ text: "hello", systemPrompt: "" }]);
    expect(session.agent.systemPrompt).toBe("original system prompt");
  });
});
