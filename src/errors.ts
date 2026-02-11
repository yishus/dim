export function isAbortError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    ((err as Error).message?.includes("Request was aborted") ||
      (err as Error).message?.includes("AbortError") ||
      (err as Error).name === "AbortError" ||
      (err as Error).name === "APIUserAbortError")
  );
}

export function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message;
    return (
      msg.includes("429") ||
      msg.includes("500") ||
      msg.includes("503") ||
      msg.includes("ECONNRESET") ||
      msg.includes("ETIMEDOUT")
    );
  }
  return false;
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 1000;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries || !isRetryableError(err)) throw err;
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt));
    }
  }
  throw new Error("unreachable");
}
