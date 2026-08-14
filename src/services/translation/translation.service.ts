import { messageRepository } from '../../repositories/message.repository';
import { languageRepository } from '../../repositories/language.repository';
import { messageTranslationRepository } from '../../repositories/messageTranslation.repository';
import { userRepository } from '../../repositories/user.repository';
import { translationCache } from './cache';
import { withRetry } from './retry';
import { TranslationProvider, TranslationProviderError } from './types';
import { getConfiguredProvider } from './provider.registry';
import { AppError } from '../../utils/AppError';
import { logger } from '../../config/logger';
import { MessageTranslationDTO, toMessageTranslationDTO } from '../../types/translation.types';

const RETRY_OPTIONS = { attempts: 3, baseDelayMs: 200 };

export function createTranslationService(provider: TranslationProvider) {
  // Note: the cache is keyed by (text, targetLanguage) only, per Section 15 —
  // it doesn't account for sourceLanguageHint. Two different senders with
  // different preferred languages sending the identical ambiguous short
  // phrase could share a cached low-confidence-fallback result meant for the
  // first sender. Accepted as a rare, low-severity edge case rather than
  // fragmenting the cache key for it.
  async function translateText(text: string, targetLanguage: string, sourceLanguageHint?: string) {
    const cached = await translationCache.get(text, targetLanguage);
    if (cached) return cached;

    const result = await withRetry(
      () => provider.translate({ text, targetLanguage, sourceLanguageHint }),
      RETRY_OPTIONS,
    );
    await translationCache.set(text, targetLanguage, result);
    return result;
  }

  // Never throws for provider-level failures — the row is always persisted
  // (COMPLETED or FAILED) so a caller (Phase 6's send pipeline, or the manual
  // REST endpoint) never has to wrap this in its own try/catch to stay safe.
  // Only "message not found" throws, since that's a caller bug, not a
  // foreseeable runtime condition.
  async function translateMessage(messageId: string, targetLanguageCode: string): Promise<MessageTranslationDTO> {
    const message = await messageRepository.findById(messageId);
    if (!message || message.deletedAt) {
      throw AppError.notFound('Message not found', 'MESSAGE_NOT_FOUND');
    }

    const existing = await messageTranslationRepository.findByMessageAndLanguage(messageId, targetLanguageCode);
    if (existing?.status === 'COMPLETED') {
      return toMessageTranslationDTO(existing);
    }

    const targetLanguage = await languageRepository.findByCode(targetLanguageCode);
    if (!targetLanguage || !targetLanguage.isActive || !targetLanguage.translationSupported) {
      const row = await messageTranslationRepository.upsertFailed(
        messageId,
        targetLanguageCode,
        provider.name,
        'UNSUPPORTED_LANGUAGE',
      );
      return toMessageTranslationDTO(row);
    }

    try {
      const sender = await userRepository.findById(message.senderId);
      const { translatedText, detectedSourceLanguage } = await translateText(
        message.originalContent,
        targetLanguageCode,
        sender?.preferredLanguageCode,
      );

      if (!message.detectedLanguage) {
        // Best-effort: detection succeeded (we have a result to persist as the
        // translation), so a failure writing this side metadata shouldn't turn
        // an otherwise-successful translation into a failure.
        await messageRepository.updateDetectedLanguage(messageId, detectedSourceLanguage).catch((err) => {
          logger.error('Failed to persist detected language', { messageId, error: (err as Error).message });
        });
      }

      const row = await messageTranslationRepository.upsertCompleted(
        messageId,
        targetLanguageCode,
        translatedText,
        provider.name,
      );
      return toMessageTranslationDTO(row);
    } catch (err) {
      const reason = err instanceof TranslationProviderError ? err.message : 'Unknown translation error';
      logger.error('Translation failed', {
        messageId,
        targetLanguage: targetLanguageCode,
        provider: provider.name,
        reason,
      });
      const row = await messageTranslationRepository.upsertFailed(messageId, targetLanguageCode, provider.name, reason);
      return toMessageTranslationDTO(row);
    }
  }

  return { translateText, translateMessage, providerName: provider.name };
}

export type TranslationService = ReturnType<typeof createTranslationService>;
export const translationService = createTranslationService(getConfiguredProvider());
