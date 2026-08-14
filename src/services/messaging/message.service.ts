import { messageRepository } from '../../repositories/message.repository';
import { conversationRepository } from '../../repositories/conversation.repository';
import { messageTranslationRepository } from '../../repositories/messageTranslation.repository';
import { userRepository } from '../../repositories/user.repository';
import { AppError } from '../../utils/AppError';
import { MessageDTO, toMessageDTO } from '../../types/message.types';
import { toMessageTranslationDTO, MessageTranslationDTO } from '../../types/translation.types';
import { emitToConversation } from '../../websocket/emitter';
import { scheduleTranslateForRecipients } from './autoTranslate';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 30;

async function assertParticipant(conversationId: string, userId: string): Promise<void> {
  const isParticipant = await conversationRepository.isParticipant(conversationId, userId);
  if (!isParticipant) {
    // 404 rather than 403 — consistent with conversation access (don't leak existence).
    throw AppError.notFound('Conversation not found', 'CONVERSATION_NOT_FOUND');
  }
}

async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
): Promise<MessageDTO> {
  await assertParticipant(conversationId, senderId);

  const message = await messageRepository.create({
    conversationId,
    senderId,
    originalContent: content,
    detectedLanguage: null,
  });
  await conversationRepository.touchUpdatedAt(conversationId);

  const dto = toMessageDTO(message);
  emitToConversation(conversationId, 'message:new', dto);

  // Deliberately not awaited — message delivery must never wait on
  // translation (Section 30's lifecycle).
  scheduleTranslateForRecipients(message.id, conversationId, senderId);

  return dto;
}

export interface MessageWithTranslation extends MessageDTO {
  // The requesting user's own translation of this message, if one exists —
  // null if none was needed (same language) or none has completed yet.
  translation: MessageTranslationDTO | null;
}

export interface MessagePage {
  messages: MessageWithTranslation[];
  nextCursor: string | null;
}

async function listMessages(
  conversationId: string,
  userId: string,
  options: { before?: string; limit?: number },
): Promise<MessagePage> {
  await assertParticipant(conversationId, userId);

  const limit = Math.min(options.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const messages = await messageRepository.listByConversation(conversationId, {
    before: options.before,
    limit,
  });

  const requester = await userRepository.findById(userId);
  const translations = requester
    ? await messageTranslationRepository.findManyByMessageIdsAndLanguage(
        messages.map((m) => m.id),
        requester.preferredLanguageCode,
      )
    : [];
  const translationByMessageId = new Map(translations.map((t) => [t.messageId, t]));

  const nextCursor = messages.length === limit ? (messages[messages.length - 1]?.id ?? null) : null;
  return {
    messages: messages.map((m) => ({
      ...toMessageDTO(m),
      translation: translationByMessageId.has(m.id)
        ? toMessageTranslationDTO(translationByMessageId.get(m.id)!)
        : null,
    })),
    nextCursor,
  };
}

async function getOwnedMessage(messageId: string, userId: string) {
  const message = await messageRepository.findById(messageId);
  if (!message || message.deletedAt) throw AppError.notFound('Message not found', 'MESSAGE_NOT_FOUND');
  if (message.senderId !== userId) {
    throw AppError.forbidden('You can only modify your own messages', 'NOT_MESSAGE_OWNER');
  }
  return message;
}

async function editMessage(messageId: string, userId: string, content: string): Promise<MessageDTO> {
  await getOwnedMessage(messageId, userId);
  const updated = await messageRepository.updateContent(messageId, content);
  const dto = toMessageDTO(updated);
  emitToConversation(updated.conversationId, 'message:updated', dto);
  return dto;
}

async function deleteMessage(messageId: string, userId: string): Promise<void> {
  const message = await getOwnedMessage(messageId, userId);
  const deleted = await messageRepository.softDelete(messageId);
  emitToConversation(message.conversationId, 'message:deleted', { id: deleted.id });
}

async function markDelivered(messageId: string, userId: string): Promise<MessageDTO | null> {
  const message = await messageRepository.findById(messageId);
  if (!message) return null;
  await assertParticipant(message.conversationId, userId);
  if (message.senderId === userId) return null; // can't "deliver" your own message to yourself

  const updated = await messageRepository.markDelivered(messageId);
  if (!updated) return null;

  const dto = toMessageDTO(updated);
  emitToConversation(updated.conversationId, 'message:delivered', { id: dto.id, status: dto.status });
  return dto;
}

async function markReadUpTo(conversationId: string, userId: string, messageId: string): Promise<number> {
  await assertParticipant(conversationId, userId);

  const updatedCount = await messageRepository.markReadUpTo(conversationId, userId, messageId);
  await conversationRepository.updateLastRead(conversationId, userId, messageId);

  if (updatedCount > 0) {
    emitToConversation(conversationId, 'message:read', { conversationId, userId, upToMessageId: messageId });
  }
  return updatedCount;
}

export const messageService = {
  sendMessage,
  listMessages,
  editMessage,
  deleteMessage,
  markDelivered,
  markReadUpTo,
};
