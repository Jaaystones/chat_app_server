import { createTranslationService } from './translation.service';
import { TranslationProvider, TranslationProviderError } from './types';
import { resetDb } from '../../test-utils/db';
import { createTestUser, createTestMessage } from '../../test-utils/factories';
import { messageRepository } from '../../repositories/message.repository';
import { redis } from '../../config/redis';

async function clearTranslationCache() {
  const keys = await redis.keys('translation:*');
  if (keys.length > 0) await redis.del(...keys);
}

function fakeProvider(translateImpl: TranslationProvider['translate']): TranslationProvider {
  return { name: 'fake', translate: jest.fn(translateImpl) };
}

async function setupMessage(content = 'Hello, this is a test message.') {
  const sender = await createTestUser({ preferredLanguage: 'en' });
  const recipient = await createTestUser({ preferredLanguage: 'fr' });
  return createTestMessage({ senderId: sender.id, recipientId: recipient.id, originalContent: content });
}

beforeEach(async () => {
  await resetDb();
  await clearTranslationCache();
});

describe('translateMessage', () => {
  it('persists a COMPLETED translation and records the detected source language on the message', async () => {
    const message = await setupMessage('Hello there');
    const provider = fakeProvider(async () => ({
      translatedText: 'Bonjour',
      detectedSourceLanguage: 'en',
    }));
    const service = createTranslationService(provider);

    const result = await service.translateMessage(message.id, 'fr');

    expect(result.status).toBe('COMPLETED');
    expect(result.translatedContent).toBe('Bonjour');
    expect(result.provider).toBe('fake');

    const updated = await messageRepository.findById(message.id);
    expect(updated?.detectedLanguage).toBe('en');
  });

  it('prevents duplicate translation: a second call for the same message+language does not re-invoke the provider', async () => {
    const message = await setupMessage('Same message');
    const provider = fakeProvider(async () => ({
      translatedText: 'Même message',
      detectedSourceLanguage: 'en',
    }));
    const service = createTranslationService(provider);

    const first = await service.translateMessage(message.id, 'fr');
    const second = await service.translateMessage(message.id, 'fr');

    expect(second.id).toBe(first.id);
    expect(provider.translate).toHaveBeenCalledTimes(1);
  });

  it('uses the cache across different messages with identical text and target language', async () => {
    const identicalText = 'This exact text repeats';
    const messageA = await setupMessage(identicalText);
    const messageB = await setupMessage(identicalText);
    const provider = fakeProvider(async () => ({
      translatedText: 'Ce texte exact se répète',
      detectedSourceLanguage: 'en',
    }));
    const service = createTranslationService(provider);

    await service.translateMessage(messageA.id, 'fr');
    const resultB = await service.translateMessage(messageB.id, 'fr');

    expect(resultB.status).toBe('COMPLETED');
    expect(resultB.translatedContent).toBe('Ce texte exact se répète');
    expect(provider.translate).toHaveBeenCalledTimes(1);
  });

  it('retries a transient failure and succeeds within the retry budget', async () => {
    const message = await setupMessage();
    let calls = 0;
    const provider = fakeProvider(async () => {
      calls += 1;
      if (calls < 3) throw new TranslationProviderError('flaky', true);
      return { translatedText: 'Recovered', detectedSourceLanguage: 'en' };
    });
    const service = createTranslationService(provider);

    const result = await service.translateMessage(message.id, 'fr');

    expect(result.status).toBe('COMPLETED');
    expect(result.translatedContent).toBe('Recovered');
    expect(calls).toBe(3);
  });

  it('marks FAILED (without throwing) once retries are exhausted', async () => {
    const message = await setupMessage();
    const provider = fakeProvider(async () => {
      throw new TranslationProviderError('provider down', true);
    });
    const service = createTranslationService(provider);

    const result = await service.translateMessage(message.id, 'fr');

    expect(result.status).toBe('FAILED');
    expect(result.errorMessage).toContain('provider down');
    expect(provider.translate).toHaveBeenCalledTimes(3);
  });

  it('does not retry a non-retryable provider error', async () => {
    const message = await setupMessage();
    const provider = fakeProvider(async () => {
      throw new TranslationProviderError('bad request', false);
    });
    const service = createTranslationService(provider);

    const result = await service.translateMessage(message.id, 'fr');

    expect(result.status).toBe('FAILED');
    expect(provider.translate).toHaveBeenCalledTimes(1);
  });

  it('never loses the original message when translation fails — the row still exists', async () => {
    const message = await setupMessage('Original content must survive');
    const provider = fakeProvider(async () => {
      throw new TranslationProviderError('provider down', true);
    });
    const service = createTranslationService(provider);

    await service.translateMessage(message.id, 'fr');

    const stillThere = await messageRepository.findById(message.id);
    expect(stillThere?.originalContent).toBe('Original content must survive');
  });

  it('marks FAILED with UNSUPPORTED_LANGUAGE for a language the provider does not support, without calling the provider', async () => {
    const message = await setupMessage();
    const provider = fakeProvider(async () => ({ translatedText: 'x', detectedSourceLanguage: 'en' }));
    const service = createTranslationService(provider);

    // Seeded with translationSupported: false.
    const result = await service.translateMessage(message.id, 'yo');

    expect(result.status).toBe('FAILED');
    expect(result.errorMessage).toBe('UNSUPPORTED_LANGUAGE');
    expect(provider.translate).not.toHaveBeenCalled();
  });

  it('marks FAILED for a target language code that does not exist at all', async () => {
    const message = await setupMessage();
    const provider = fakeProvider(async () => ({ translatedText: 'x', detectedSourceLanguage: 'en' }));
    const service = createTranslationService(provider);

    const result = await service.translateMessage(message.id, 'zz');

    expect(result.status).toBe('FAILED');
    expect(result.errorMessage).toBe('UNSUPPORTED_LANGUAGE');
    expect(provider.translate).not.toHaveBeenCalled();
  });

  it('throws for a message that does not exist', async () => {
    const provider = fakeProvider(async () => ({ translatedText: 'x', detectedSourceLanguage: 'en' }));
    const service = createTranslationService(provider);

    await expect(
      service.translateMessage('00000000-0000-0000-0000-000000000000', 'fr'),
    ).rejects.toMatchObject({ code: 'MESSAGE_NOT_FOUND' });
  });

  it('throws for a soft-deleted message', async () => {
    const message = await setupMessage();
    await messageRepository.softDelete(message.id);
    const provider = fakeProvider(async () => ({ translatedText: 'x', detectedSourceLanguage: 'en' }));
    const service = createTranslationService(provider);

    await expect(service.translateMessage(message.id, 'fr')).rejects.toMatchObject({
      code: 'MESSAGE_NOT_FOUND',
    });
  });
});
