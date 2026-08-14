import { TranslationProviderError } from './types';

export interface RetryOptions {
  attempts: number;
  baseDelayMs: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Bounded exponential backoff. Only retries errors the provider marked
// retryable (network failures, 429s, 5xx) — a 400 for an unsupported
// language pair, for instance, will never succeed on retry.
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await fn();
    } catch (err) {
      lastError = err;
      const retryable = err instanceof TranslationProviderError ? err.retryable : true;
      if (!retryable || attempt === options.attempts) throw err;
      // eslint-disable-next-line no-await-in-loop
      await sleep(options.baseDelayMs * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}
