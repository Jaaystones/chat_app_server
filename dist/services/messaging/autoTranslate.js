"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translateForRecipients = translateForRecipients;
exports.scheduleTranslateForRecipients = scheduleTranslateForRecipients;
exports.waitForPendingAutoTranslations = waitForPendingAutoTranslations;
const conversation_repository_1 = require("../../repositories/conversation.repository");
const translation_service_1 = require("../translation/translation.service");
const emitter_1 = require("../../websocket/emitter");
const logger_1 = require("../../config/logger");
// Connects the translation engine to live messaging (Phase 6). Fire-and-forget
// by design — the message is already persisted and delivered (Section 30's
// lifecycle) before this runs, so nothing here may block or fail message send.
async function translateForRecipients(messageId, conversationId, senderId) {
    const participants = await conversation_repository_1.conversationRepository.getParticipantLanguagePrefs(conversationId);
    const sender = participants.find((p) => p.userId === senderId);
    if (!sender)
        return;
    const recipients = participants.filter((p) => p.userId !== senderId);
    await Promise.all(recipients.map(async (recipient) => {
        // Section 10: same preferred language on both sides — never call the provider.
        if (recipient.preferredLanguageCode === sender.preferredLanguageCode)
            return;
        // Section 23: per-user opt-out of automatic translation.
        if (!recipient.autoTranslate)
            return;
        try {
            const translation = await translation_service_1.translationService.translateMessage(messageId, recipient.preferredLanguageCode);
            if (translation.status === 'COMPLETED') {
                (0, emitter_1.emitToConversation)(conversationId, 'message:translation:ready', translation);
            }
            else if (translation.status === 'FAILED') {
                (0, emitter_1.emitToConversation)(conversationId, 'message:translation:failed', translation);
            }
        }
        catch (err) {
            // translateMessage itself only throws for a caller bug (message not
            // found) — this catch exists so a bug there can never take down
            // messaging, consistent with Rule 8.
            logger_1.logger.error('Auto-translation failed unexpectedly', {
                messageId,
                targetLanguage: recipient.preferredLanguageCode,
                error: err.message,
            });
        }
    }));
}
// translateForRecipients is intentionally fire-and-forget from the caller's
// perspective (message.service.ts never awaits it — see the comment above).
// But "fire-and-forget" still needs a way to be drained: without this,
// background jobs can still be running when a test's afterEach/afterAll (or,
// in principle, a process shutdown) tears down the DB connection out from
// under them. scheduleTranslateForRecipients tracks in-flight work so
// waitForPendingAutoTranslations() can drain it deterministically.
const pending = new Set();
function scheduleTranslateForRecipients(messageId, conversationId, senderId) {
    const job = translateForRecipients(messageId, conversationId, senderId).catch((err) => {
        logger_1.logger.error('Failed to schedule auto-translation', { messageId, error: err.message });
    });
    pending.add(job);
    void job.finally(() => pending.delete(job));
}
async function waitForPendingAutoTranslations() {
    await Promise.all(Array.from(pending));
}
//# sourceMappingURL=autoTranslate.js.map