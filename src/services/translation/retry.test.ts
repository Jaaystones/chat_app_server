import { withRetry } from './retry';
import { TranslationProviderError } from './types';

describe('withRetry', () => {
  it('returns the result on first success without retrying', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { attempts: 3, baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries retryable errors up to the attempt limit, then succeeds', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new TranslationProviderError('transient', true))
      .mockRejectedValueOnce(new TranslationProviderError('transient', true))
      .mockResolvedValue('ok');

    const result = await withRetry(fn, { attempts: 3, baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting all attempts', async () => {
    const fn = jest.fn().mockRejectedValue(new TranslationProviderError('always fails', true));

    await expect(withRetry(fn, { attempts: 3, baseDelayMs: 1 })).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry a non-retryable error', async () => {
    const fn = jest.fn().mockRejectedValue(new TranslationProviderError('bad request', false));

    await expect(withRetry(fn, { attempts: 3, baseDelayMs: 1 })).rejects.toThrow('bad request');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('treats non-TranslationProviderError exceptions as retryable', async () => {
    const fn = jest.fn().mockRejectedValueOnce(new Error('weird')).mockResolvedValue('ok');

    const result = await withRetry(fn, { attempts: 3, baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
