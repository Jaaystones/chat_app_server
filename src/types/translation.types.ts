import { MessageTranslation, TranslationStatus } from '@prisma/client';

export interface MessageTranslationDTO {
  id: string;
  messageId: string;
  targetLanguage: string;
  translatedContent: string | null;
  provider: string;
  status: TranslationStatus;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toMessageTranslationDTO(row: MessageTranslation): MessageTranslationDTO {
  return {
    id: row.id,
    messageId: row.messageId,
    targetLanguage: row.targetLanguage,
    translatedContent: row.translatedContent,
    provider: row.provider,
    status: row.status,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
