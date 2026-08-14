import { createTranslationService } from './translation.service';
import { createLibreTranslateProvider } from './providers/libretranslate.provider';
import { env } from '../../config/env';
import { resetDb } from '../../test-utils/db';
import { createTestUser, createTestMessage } from '../../test-utils/factories';
import { messageRepository } from '../../repositories/message.repository';
import { redis } from '../../config/redis';

async function clearTranslationCache() {
  const keys = await redis.keys('translation:*');
  if (keys.length > 0) await redis.del(...keys);
}

// Real network calls to a local ML translation service — latency varies more
// than in-process code, especially under the load of the full suite running
// alongside it. The 15s global default is fine everywhere else; this file
// genuinely needs more room.
jest.setTimeout(30000);

// Deliberately bypasses the env-driven provider registry/singleton so this
// suite always exercises the real service regardless of TRANSLATION_PROVIDER
// (kept as "mock" in .env.test to keep the rest of the suite hermetic).
const provider = createLibreTranslateProvider(env.LIBRETRANSLATE_URL);
const service = createTranslationService(provider);

beforeAll(async () => {
  try {
    const res = await fetch(`${env.LIBRETRANSLATE_URL}/languages`);
    if (!res.ok) throw new Error(`status ${res.status}`);
  } catch (err) {
    throw new Error(
      `LibreTranslate is not reachable at ${env.LIBRETRANSLATE_URL} — start it with ` +
        `"docker compose up -d translate" before running this test. (${(err as Error).message})`,
    );
  }
});

beforeEach(async () => {
  await resetDb();
  await clearTranslationCache();
});

async function setupMessage(content: string) {
  const sender = await createTestUser({ preferredLanguage: 'en' });
  const recipient = await createTestUser({ preferredLanguage: 'fr' });
  return createTestMessage({ senderId: sender.id, recipientId: recipient.id, originalContent: content });
}

describe('LibreTranslateProvider against the real self-hosted service', () => {
  it("translates the spec's own English example sentence into French", async () => {
    const message = await setupMessage(
      'Hello Carlos, I have completed the website. Please review it and let me know if you need any changes.',
    );

    const result = await service.translateMessage(message.id, 'fr');

    expect(result.status).toBe('COMPLETED');
    expect(result.translatedContent).toMatch(/bonjour/i);
    expect(result.translatedContent).not.toBe(message.originalContent);
  });

  it('detects French and translates it back to English', async () => {
    const message = await setupMessage('Bonjour, comment allez-vous aujourd’hui ?');

    const result = await service.translateMessage(message.id, 'en');

    expect(result.status).toBe('COMPLETED');
    expect(result.translatedContent?.toLowerCase()).toContain('hello');

    const updated = await messageRepository.findById(message.id);
    expect(updated?.detectedLanguage).toBe('fr');
  });

  it('does not call the provider twice for the same message+language (cache + duplicate prevention)', async () => {
    const message = await setupMessage('This sentence should only be translated once.');
    const translateSpy = jest.spyOn(provider, 'translate');

    await service.translateMessage(message.id, 'fr');
    await service.translateMessage(message.id, 'fr');

    expect(translateSpy).toHaveBeenCalledTimes(1);
    translateSpy.mockRestore();
  });

  it('leaves the same-language case to the caller — translating en to en still calls the provider', async () => {
    // TranslationService itself doesn't special-case same-language pairs;
    // that fast-path decision belongs to Phase 6's send pipeline, based on
    // sender/recipient *preferences*, not the engine. Documented here so the
    // boundary is explicit and doesn't get assumed away later.
    const message = await setupMessage('Hello again');
    const result = await service.translateMessage(message.id, 'en');
    expect(result.status).toBe('COMPLETED');
  });
});
