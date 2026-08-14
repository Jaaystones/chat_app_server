import {
  conversationRepository,
  ConversationWithParticipants,
} from '../../repositories/conversation.repository';
import { userRepository } from '../../repositories/user.repository';
import { AppError } from '../../utils/AppError';
import { toPublicUser } from '../../types/user.types';
import { ConversationDTO } from '../../types/conversation.types';
import { joinConversationRoom } from '../../websocket/emitter';

function toDTO(conversation: ConversationWithParticipants, currentUserId: string): ConversationDTO {
  const participants = conversation.participants.map((p) => toPublicUser(p.user));
  const otherParticipant =
    conversation.type === 'DIRECT' ? participants.find((p) => p.id !== currentUserId) : undefined;

  return {
    id: conversation.id,
    type: conversation.type,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    participants,
    otherParticipant,
  };
}

async function createDirect(
  currentUserId: string,
  targetUserId: string,
): Promise<{ conversation: ConversationDTO; created: boolean }> {
  if (currentUserId === targetUserId) {
    throw AppError.badRequest('Cannot start a conversation with yourself', 'INVALID_PARTICIPANT');
  }

  const targetUser = await userRepository.findById(targetUserId);
  if (!targetUser) throw AppError.notFound('User not found', 'USER_NOT_FOUND');

  const existing = await conversationRepository.findDirectBetween(currentUserId, targetUserId);
  if (existing) {
    return { conversation: toDTO(existing, currentUserId), created: false };
  }

  const conversation = await conversationRepository.createDirect(currentUserId, targetUserId);
  joinConversationRoom(conversation.id, [currentUserId, targetUserId]);
  return { conversation: toDTO(conversation, currentUserId), created: true };
}

async function listForUser(userId: string): Promise<ConversationDTO[]> {
  const conversations = await conversationRepository.findAllForUser(userId);
  return conversations.map((c) => toDTO(c, userId));
}

async function getByIdForUser(conversationId: string, userId: string): Promise<ConversationDTO> {
  const conversation = await conversationRepository.findById(conversationId);

  // A conversation the user isn't part of is reported as not-found rather than
  // forbidden, so its existence isn't leaked to non-participants.
  const isParticipant = conversation?.participants.some((p) => p.userId === userId) ?? false;
  if (!conversation || !isParticipant) {
    throw AppError.notFound('Conversation not found', 'CONVERSATION_NOT_FOUND');
  }

  return toDTO(conversation, userId);
}

export const conversationService = {
  createDirect,
  listForUser,
  getByIdForUser,
};
