// lib/retry.ts
// リトライロジック

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
  shouldRetry: (error: unknown, attempt: number) => {
    // ネットワークエラーやタイムアウトの場合はリトライ
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes("network") ||
        message.includes("timeout") ||
        message.includes("fetch") ||
        attempt < 3
      );
    }
    return attempt < 3;
  },
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === opts.maxAttempts || !opts.shouldRetry(error, attempt)) {
        throw error;
      }

      const delay = Math.min(
        opts.delayMs * opts.backoffMultiplier ** (attempt - 1),
        opts.maxDelayMs,
      );

      console.warn(
        `Retry attempt ${attempt}/${opts.maxAttempts} after ${delay}ms`,
        error,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export function createRetryFetcher(options: RetryOptions = {}) {
  return async <T>(url: string, init?: RequestInit): Promise<T> => {
    return withRetry(async () => {
      const response = await fetch(url, init);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    }, options);
  };
}
