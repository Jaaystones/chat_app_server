import { MessageTranslation, TranslationStatus } from '@prisma/client';
import { prisma } from '../config/prisma';

export const messageTranslationRepository = {
  findByMessageAndLanguage(messageId: string, targetLanguage: string): Promise<MessageTranslation | null> {
    return prisma.messageTranslation.findUnique({
      where: { messageId_targetLanguage: { messageId, targetLanguage } },
    });
  },

  // Batched for message-history pagination — one query per page, not one per message.
  findManyByMessageIdsAndLanguage(
    messageIds: string[],
    targetLanguage: string,
  ): Promise<MessageTranslation[]> {
    if (messageIds.length === 0) return Promise.resolve([]);
    return prisma.messageTranslation.findMany({
      where: { messageId: { in: messageIds }, targetLanguage },
    });
  },

  upsertCompleted(
    messageId: string,
    targetLanguage: string,
    translatedContent: string,
    provider: string,
  ): Promise<MessageTranslation> {
    return prisma.messageTranslation.upsert({
      where: { messageId_targetLanguage: { messageId, targetLanguage } },
      update: { translatedContent, provider, status: TranslationStatus.COMPLETED, errorMessage: null },
      create: { messageId, targetLanguage, translatedContent, provider, status: TranslationStatus.COMPLETED },
    });
  },

  upsertFailed(
    messageId: string,
    targetLanguage: string,
    provider: string,
    errorMessage: string,
  ): Promise<MessageTranslation> {
    return prisma.messageTranslation.upsert({
      where: { messageId_targetLanguage: { messageId, targetLanguage } },
      update: { status: TranslationStatus.FAILED, errorMessage, provider },
      create: { messageId, targetLanguage, provider, status: TranslationStatus.FAILED, errorMessage },
    });
  },
};
