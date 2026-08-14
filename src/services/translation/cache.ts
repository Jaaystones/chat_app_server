import crypto from 'crypto';
import { redis } from '../../config/redis';
import { TranslateResult } from './types';

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

// Content-hash + target-language only (Section 15) — deliberately NOT scoped
// by user or message, since it's a pure function of (text, targetLanguage)
// and detection is deterministic for identical input. Never key this by
// user/conversation: that would either fragment the cache for no reason or,
// worse, invite leaking one user's cached translation into another's request.
function cacheKey(text: string, targetLanguage: string): string {
  const hash = crypto.createHash('sha256').update(text).digest('hex');
  return `translation:${hash}:${targetLanguage}`;
}

async function get(text: string, targetLanguage: string): Promise<TranslateResult | null> {
  const raw = await redis.get(cacheKey(text, targetLanguage));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TranslateResult;
  } catch {
    return null;
  }
}

async function set(text: string, targetLanguage: string, result: TranslateResult): Promise<void> {
  await redis.set(cacheKey(text, targetLanguage), JSON.stringify(result), 'EX', TTL_SECONDS);
}

export const translationCache = { get, set };
