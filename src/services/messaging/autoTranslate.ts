import { conversationRepository } from '../../repositories/conversation.repository';
import { translationService } from '../translation/translation.service';
import { emitToConversation } from '../../websocket/emitter';
import { logger } from '../../config/logger';

// Connects the translation engine to live messaging (Phase 6). Fire-and-forget
// by design — the message is already persisted and delivered (Section 30's
// lifecycle) before this runs, so nothing here may block or fail message send.
export async function translateForRecipients(
  messageId: string,
  conversationId: string,
  senderId: string,
): Promise<void> {
  const participants = await conversationRepository.getParticipantLanguagePrefs(conversationId);
  const sender = participants.find((p) => p.userId === senderId);
  if (!sender) return;

  const recipients = participants.filter((p) => p.userId !== senderId);

  await Promise.all(
    recipients.map(async (recipient) => {
      // Section 10: same preferred language on both sides — never call the provider.
      if (recipient.preferredLanguageCode === sender.preferredLanguageCode) return;
      // Section 23: per-user opt-out of automatic translation.
      if (!recipient.autoTranslate) return;

      try {
        const translation = await translationService.translateMessage(messageId, recipient.preferredLanguageCode);
        if (translation.status === 'COMPLETED') {
          emitToConversation(conversationId, 'message:translation:ready', translation);
        } else if (translation.status === 'FAILED') {
          emitToConversation(conversationId, 'message:translation:failed', translation);
        }
      } catch (err) {
        // translateMessage itself only throws for a caller bug (message not
        // found) — this catch exists so a bug there can never take down
        // messaging, consistent with Rule 8.
        logger.error('Auto-translation failed unexpectedly', {
          messageId,
          targetLanguage: recipient.preferredLanguageCode,
          error: (err as Error).message,
        });
      }
    }),
  );
}

// translateForRecipients is intentionally fire-and-forget from the caller's
// perspective (message.service.ts never awaits it — see the comment above).
// But "fire-and-forget" still needs a way to be drained: without this,
// background jobs can still be running when a test's afterEach/afterAll (or,
// in principle, a process shutdown) tears down the DB connection out from
// under them. scheduleTranslateForRecipients tracks in-flight work so
// waitForPendingAutoTranslations() can drain it deterministically.
const pending = new Set<Promise<void>>();

export function scheduleTranslateForRecipients(
  messageId: string,
  conversationId: string,
  senderId: string,
): void {
  const job = translateForRecipients(messageId, conversationId, senderId).catch((err) => {
    logger.error('Failed to schedule auto-translation', { messageId, error: (err as Error).message });
  });
  pending.add(job);
  void job.finally(() => pending.delete(job));
}

export async function waitForPendingAutoTranslations(): Promise<void> {
  await Promise.all(Array.from(pending));
}
