import { translationCache } from './cache';
import { redis } from '../../config/redis';

async function clearTranslationKeys() {
  const keys = await redis.keys('translation:*');
  if (keys.length > 0) await redis.del(...keys);
}

beforeEach(async () => {
  await clearTranslationKeys();
});

describe('translationCache', () => {
  it('returns null on a miss', async () => {
    const result = await translationCache.get('never cached', 'fr');
    expect(result).toBeNull();
  });

  it('round-trips a stored result', async () => {
    await translationCache.set('Hello', 'fr', { translatedText: 'Bonjour', detectedSourceLanguage: 'en' });
    const result = await translationCache.get('Hello', 'fr');
    expect(result).toEqual({ translatedText: 'Bonjour', detectedSourceLanguage: 'en' });
  });

  it('keys by target language independently for the same text', async () => {
    await translationCache.set('Hello', 'fr', { translatedText: 'Bonjour', detectedSourceLanguage: 'en' });
    const esResult = await translationCache.get('Hello', 'es');
    expect(esResult).toBeNull();
  });

  it('keys by text content independently for the same target language', async () => {
    await translationCache.set('Hello', 'fr', { translatedText: 'Bonjour', detectedSourceLanguage: 'en' });
    const otherText = await translationCache.get('Goodbye', 'fr');
    expect(otherText).toBeNull();
  });
});
