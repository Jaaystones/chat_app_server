"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translationService = void 0;
exports.createTranslationService = createTranslationService;
const message_repository_1 = require("../../repositories/message.repository");
const language_repository_1 = require("../../repositories/language.repository");
const messageTranslation_repository_1 = require("../../repositories/messageTranslation.repository");
const cache_1 = require("./cache");
const retry_1 = require("./retry");
const types_1 = require("./types");
const provider_registry_1 = require("./provider.registry");
const AppError_1 = require("../../utils/AppError");
const logger_1 = require("../../config/logger");
const translation_types_1 = require("../../types/translation.types");
const RETRY_OPTIONS = { attempts: 3, baseDelayMs: 200 };
function createTranslationService(provider) {
    async function translateText(text, targetLanguage) {
        const cached = await cache_1.translationCache.get(text, targetLanguage);
        if (cached)
            return cached;
        const result = await (0, retry_1.withRetry)(() => provider.translate({ text, targetLanguage }), RETRY_OPTIONS);
        await cache_1.translationCache.set(text, targetLanguage, result);
        return result;
    }
    // Never throws for provider-level failures — the row is always persisted
    // (COMPLETED or FAILED) so a caller (Phase 6's send pipeline, or the manual
    // REST endpoint) never has to wrap this in its own try/catch to stay safe.
    // Only "message not found" throws, since that's a caller bug, not a
    // foreseeable runtime condition.
    async function translateMessage(messageId, targetLanguageCode) {
        const message = await message_repository_1.messageRepository.findById(messageId);
        if (!message || message.deletedAt) {
            throw AppError_1.AppError.notFound('Message not found', 'MESSAGE_NOT_FOUND');
        }
        const existing = await messageTranslation_repository_1.messageTranslationRepository.findByMessageAndLanguage(messageId, targetLanguageCode);
        if (existing?.status === 'COMPLETED') {
            return (0, translation_types_1.toMessageTranslationDTO)(existing);
        }
        const targetLanguage = await language_repository_1.languageRepository.findByCode(targetLanguageCode);
        if (!targetLanguage || !targetLanguage.isActive || !targetLanguage.translationSupported) {
            const row = await messageTranslation_repository_1.messageTranslationRepository.upsertFailed(messageId, targetLanguageCode, provider.name, 'UNSUPPORTED_LANGUAGE');
            return (0, translation_types_1.toMessageTranslationDTO)(row);
        }
        try {
            const { translatedText, detectedSourceLanguage } = await translateText(message.originalContent, targetLanguageCode);
            if (!message.detectedLanguage) {
                // Best-effort: detection succeeded (we have a result to persist as the
                // translation), so a failure writing this side metadata shouldn't turn
                // an otherwise-successful translation into a failure.
                await message_repository_1.messageRepository.updateDetectedLanguage(messageId, detectedSourceLanguage).catch((err) => {
                    logger_1.logger.error('Failed to persist detected language', { messageId, error: err.message });
                });
            }
            const row = await messageTranslation_repository_1.messageTranslationRepository.upsertCompleted(messageId, targetLanguageCode, translatedText, provider.name);
            return (0, translation_types_1.toMessageTranslationDTO)(row);
        }
        catch (err) {
            const reason = err instanceof types_1.TranslationProviderError ? err.message : 'Unknown translation error';
            logger_1.logger.error('Translation failed', {
                messageId,
                targetLanguage: targetLanguageCode,
                provider: provider.name,
                reason,
            });
            const row = await messageTranslation_repository_1.messageTranslationRepository.upsertFailed(messageId, targetLanguageCode, provider.name, reason);
            return (0, translation_types_1.toMessageTranslationDTO)(row);
        }
    }
    return { translateText, translateMessage, providerName: provider.name };
}
exports.translationService = createTranslationService((0, provider_registry_1.getConfiguredProvider)());
//# sourceMappingURL=translation.service.js.map