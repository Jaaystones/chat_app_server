"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conversationService = void 0;
const conversation_repository_1 = require("../../repositories/conversation.repository");
const user_repository_1 = require("../../repositories/user.repository");
const AppError_1 = require("../../utils/AppError");
const user_types_1 = require("../../types/user.types");
function toDTO(conversation, currentUserId) {
    const participants = conversation.participants.map((p) => (0, user_types_1.toPublicUser)(p.user));
    const otherParticipant = conversation.type === 'DIRECT' ? participants.find((p) => p.id !== currentUserId) : undefined;
    return {
        id: conversation.id,
        type: conversation.type,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        participants,
        otherParticipant,
    };
}
async function createDirect(currentUserId, targetUserId) {
    if (currentUserId === targetUserId) {
        throw AppError_1.AppError.badRequest('Cannot start a conversation with yourself', 'INVALID_PARTICIPANT');
    }
    const targetUser = await user_repository_1.userRepository.findById(targetUserId);
    if (!targetUser)
        throw AppError_1.AppError.notFound('User not found', 'USER_NOT_FOUND');
    const existing = await conversation_repository_1.conversationRepository.findDirectBetween(currentUserId, targetUserId);
    if (existing) {
        return { conversation: toDTO(existing, currentUserId), created: false };
    }
    const conversation = await conversation_repository_1.conversationRepository.createDirect(currentUserId, targetUserId);
    return { conversation: toDTO(conversation, currentUserId), created: true };
}
async function listForUser(userId) {
    const conversations = await conversation_repository_1.conversationRepository.findAllForUser(userId);
    return conversations.map((c) => toDTO(c, userId));
}
async function getByIdForUser(conversationId, userId) {
    const conversation = await conversation_repository_1.conversationRepository.findById(conversationId);
    // A conversation the user isn't part of is reported as not-found rather than
    // forbidden, so its existence isn't leaked to non-participants.
    const isParticipant = conversation?.participants.some((p) => p.userId === userId) ?? false;
    if (!conversation || !isParticipant) {
        throw AppError_1.AppError.notFound('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }
    return toDTO(conversation, userId);
}
exports.conversationService = {
    createDirect,
    listForUser,
    getByIdForUser,
};
//# sourceMappingURL=conversation.service.js.map