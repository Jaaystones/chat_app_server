import { Message, MessageStatus, MessageType } from '@prisma/client';

export interface MessageDTO {
  id: string;
  conversationId: string;
  senderId: string;
  originalContent: string | null;
  detectedLanguage: string | null;
  messageType: MessageType;
  status: MessageStatus;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
}

export function toMessageDTO(message: Message): MessageDTO {
  const deleted = message.deletedAt !== null;
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    // Deleted messages keep their row (for scroll-position/pagination
    // stability) but never expose content again (Rule 7 is about never
    // losing the original — it doesn't require re-serving it once deleted).
    originalContent: deleted ? null : message.originalContent,
    detectedLanguage: message.detectedLanguage,
    messageType: message.messageType,
    status: message.status,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    editedAt: message.editedAt,
    deletedAt: message.deletedAt,
  };
}
