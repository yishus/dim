import { describe, expect, test, mock } from "bun:test";
import { TypedEventEmitter } from "../../src/typed-event-emitter";

interface TestEvents {
  data: { value: number };
  message: string;
  reset: void;
}

describe("TypedEventEmitter", () => {
  test("delivers typed payload to listener", () => {
    const emitter = new TypedEventEmitter<TestEvents>();
    const fn = mock((_payload: { value: number }) => {});

    emitter.on("data", fn);
    emitter.emit("data", { value: 42 });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith({ value: 42 });
  });

  test("supports void events with no payload", () => {
    const emitter = new TypedEventEmitter<TestEvents>();
    const fn = mock(() => {});

    emitter.on("reset", fn);
    emitter.emit("reset");

    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("off removes listener", () => {
    const emitter = new TypedEventEmitter<TestEvents>();
    const fn = mock((_payload: string) => {});

    emitter.on("message", fn);
    emitter.off("message", fn);
    emitter.emit("message", "hello");

    expect(fn).toHaveBeenCalledTimes(0);
  });

  test("removeAllListeners clears all listeners for an event", () => {
    const emitter = new TypedEventEmitter<TestEvents>();
    const fn1 = mock((_payload: string) => {});
    const fn2 = mock((_payload: string) => {});

    emitter.on("message", fn1);
    emitter.on("message", fn2);
    emitter.removeAllListeners("message");
    emitter.emit("message", "hello");

    expect(fn1).toHaveBeenCalledTimes(0);
    expect(fn2).toHaveBeenCalledTimes(0);
  });

  test("removeAllListeners with no argument clears everything", () => {
    const emitter = new TypedEventEmitter<TestEvents>();
    const fn1 = mock((_payload: { value: number }) => {});
    const fn2 = mock(() => {});

    emitter.on("data", fn1);
    emitter.on("reset", fn2);
    emitter.removeAllListeners();
    emitter.emit("data", { value: 1 });
    emitter.emit("reset");

    expect(fn1).toHaveBeenCalledTimes(0);
    expect(fn2).toHaveBeenCalledTimes(0);
  });
});
