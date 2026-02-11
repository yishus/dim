import { describe, expect, test } from "bun:test";
import { isAbortError, isRetryableError, withRetry } from "../../src/errors";

describe("isAbortError", () => {
  test("true for AbortError name", () => {
    const err = new Error("something");
    err.name = "AbortError";
    expect(isAbortError(err)).toBe(true);
  });

  test("true for APIUserAbortError name", () => {
    const err = new Error("cancelled");
    err.name = "APIUserAbortError";
    expect(isAbortError(err)).toBe(true);
  });

  test('true for "Request was aborted" message', () => {
    expect(isAbortError(new Error("Request was aborted"))).toBe(true);
  });

  test('true for "AbortError" in message', () => {
    expect(isAbortError(new Error("AbortError: fetch failed"))).toBe(true);
  });

  test("false for other errors", () => {
    expect(isAbortError(new Error("network timeout"))).toBe(false);
  });

  test("false for null and undefined", () => {
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError(undefined)).toBe(false);
  });
});

describe("isRetryableError", () => {
  test("true for 429", () => {
    expect(isRetryableError(new Error("rate limit 429"))).toBe(true);
  });

  test("true for 500", () => {
    expect(isRetryableError(new Error("server error 500"))).toBe(true);
  });

  test("true for 503", () => {
    expect(isRetryableError(new Error("service unavailable 503"))).toBe(true);
  });

  test("true for ECONNRESET", () => {
    expect(isRetryableError(new Error("ECONNRESET"))).toBe(true);
  });

  test("true for ETIMEDOUT", () => {
    expect(isRetryableError(new Error("ETIMEDOUT"))).toBe(true);
  });

  test("false for 400", () => {
    expect(isRetryableError(new Error("bad request 400"))).toBe(false);
  });

  test("false for non-Error values", () => {
    expect(isRetryableError("string error")).toBe(false);
    expect(isRetryableError(42)).toBe(false);
    expect(isRetryableError(null)).toBe(false);
  });
});

describe("withRetry", () => {
  test("returns on first success", async () => {
    const result = await withRetry(() => Promise.resolve("ok"), {
      baseDelayMs: 1,
    });
    expect(result).toBe("ok");
  });

  test("retries retryable errors", async () => {
    let attempts = 0;
    const result = await withRetry(
      () => {
        attempts++;
        if (attempts < 3) throw new Error("503 service unavailable");
        return Promise.resolve("recovered");
      },
      { baseDelayMs: 1 },
    );
    expect(result).toBe("recovered");
    expect(attempts).toBe(3);
  });

  test("throws non-retryable errors immediately", async () => {
    let attempts = 0;
    await expect(
      withRetry(
        () => {
          attempts++;
          throw new Error("bad request 400");
        },
        { baseDelayMs: 1 },
      ),
    ).rejects.toThrow("bad request 400");
    expect(attempts).toBe(1);
  });

  test("throws after max retries exhausted", async () => {
    let attempts = 0;
    await expect(
      withRetry(
        () => {
          attempts++;
          throw new Error("429 rate limited");
        },
        { maxRetries: 2, baseDelayMs: 1 },
      ),
    ).rejects.toThrow("429 rate limited");
    expect(attempts).toBe(3); // initial + 2 retries
  });
});
