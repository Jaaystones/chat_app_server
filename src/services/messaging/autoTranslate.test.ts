import { translateForRecipients } from './autoTranslate';
import { mockProvider } from '../translation/providers/mock.provider';
import { messageTranslationRepository } from '../../repositories/messageTranslation.repository';
import { userRepository } from '../../repositories/user.repository';
import { resetDb } from '../../test-utils/db';
import { createTestUser, createTestMessage } from '../../test-utils/factories';
import { redis } from '../../config/redis';

async function clearTranslationCache() {
  const keys = await redis.keys('translation:*');
  if (keys.length > 0) await redis.del(...keys);
}

beforeEach(async () => {
  await resetDb();
  await clearTranslationCache();
});

async function setupPair(
  senderLang: string,
  recipientLang: string,
  content: string,
  recipientOverrides: Partial<{ autoTranslate: boolean }> = {},
) {
  const sender = await createTestUser({ preferredLanguage: senderLang });
  const recipient = await createTestUser({ preferredLanguage: recipientLang });
  if (recipientOverrides.autoTranslate !== undefined) {
    await userRepository.update(recipient.id, { autoTranslate: recipientOverrides.autoTranslate });
  }
  const message = await createTestMessage({ senderId: sender.id, recipientId: recipient.id, originalContent: content });
  return { sender, recipient, message };
}

describe('translateForRecipients', () => {
  it('translates English to French for a French-preferring recipient', async () => {
    const { message } = await setupPair('en', 'fr', 'Hello Carlos');
    await translateForRecipients(message.id, message.conversationId, message.senderId);

    const translation = await messageTranslationRepository.findByMessageAndLanguage(message.id, 'fr');
    expect(translation?.status).toBe('COMPLETED');
    expect(translation?.translatedContent).toBe('[fr] Hello Carlos');
  });

  it('translates French to English for an English-preferring recipient', async () => {
    const { message } = await setupPair('fr', 'en', 'Bonjour Carlos');
    await translateForRecipients(message.id, message.conversationId, message.senderId);

    const translation = await messageTranslationRepository.findByMessageAndLanguage(message.id, 'en');
    expect(translation?.status).toBe('COMPLETED');
  });

  it('translates English to Spanish', async () => {
    const { message } = await setupPair('en', 'es', 'Hello there');
    await translateForRecipients(message.id, message.conversationId, message.senderId);

    const translation = await messageTranslationRepository.findByMessageAndLanguage(message.id, 'es');
    expect(translation?.status).toBe('COMPLETED');
  });

  it('translates Spanish to English', async () => {
    const { message } = await setupPair('es', 'en', 'Hola amigo');
    await translateForRecipients(message.id, message.conversationId, message.senderId);

    const translation = await messageTranslationRepository.findByMessageAndLanguage(message.id, 'en');
    expect(translation?.status).toBe('COMPLETED');
  });

  it('never calls the provider when sender and recipient share a preferred language', async () => {
    const { message } = await setupPair('en', 'en', 'Hello there');
    const translateSpy = jest.spyOn(mockProvider, 'translate');

    await translateForRecipients(message.id, message.conversationId, message.senderId);

    expect(translateSpy).not.toHaveBeenCalled();
    const translation = await messageTranslationRepository.findByMessageAndLanguage(message.id, 'en');
    expect(translation).toBeNull();

    translateSpy.mockRestore();
  });

  it('skips translation when the recipient has disabled automatic translation', async () => {
    const { message } = await setupPair('en', 'fr', 'Hello there', { autoTranslate: false });
    const translateSpy = jest.spyOn(mockProvider, 'translate');

    await translateForRecipients(message.id, message.conversationId, message.senderId);

    expect(translateSpy).not.toHaveBeenCalled();
    const translation = await messageTranslationRepository.findByMessageAndLanguage(message.id, 'fr');
    expect(translation).toBeNull();

    translateSpy.mockRestore();
  });

  it('records a FAILED translation for a recipient whose language is not provider-supported, without throwing', async () => {
    const { message } = await setupPair('en', 'yo', 'Hello there');

    await expect(
      translateForRecipients(message.id, message.conversationId, message.senderId),
    ).resolves.toBeUndefined();

    const translation = await messageTranslationRepository.findByMessageAndLanguage(message.id, 'yo');
    expect(translation?.status).toBe('FAILED');
    expect(translation?.errorMessage).toBe('UNSUPPORTED_LANGUAGE');
  });

  it('does nothing when the sender is not actually a participant (defensive, should not happen via normal flow)', async () => {
    const { message } = await setupPair('en', 'fr', 'Hello there');

    await expect(
      translateForRecipients(message.id, message.conversationId, '00000000-0000-0000-0000-000000000000'),
    ).resolves.toBeUndefined();
  });
});
