"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageService = void 0;
const message_repository_1 = require("../../repositories/message.repository");
const conversation_repository_1 = require("../../repositories/conversation.repository");
const messageTranslation_repository_1 = require("../../repositories/messageTranslation.repository");
const user_repository_1 = require("../../repositories/user.repository");
const AppError_1 = require("../../utils/AppError");
const message_types_1 = require("../../types/message.types");
const translation_types_1 = require("../../types/translation.types");
const emitter_1 = require("../../websocket/emitter");
const autoTranslate_1 = require("./autoTranslate");
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 30;
async function assertParticipant(conversationId, userId) {
    const isParticipant = await conversation_repository_1.conversationRepository.isParticipant(conversationId, userId);
    if (!isParticipant) {
        // 404 rather than 403 — consistent with conversation access (don't leak existence).
        throw AppError_1.AppError.notFound('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }
}
async function sendMessage(conversationId, senderId, content) {
    await assertParticipant(conversationId, senderId);
    const message = await message_repository_1.messageRepository.create({
        conversationId,
        senderId,
        originalContent: content,
        detectedLanguage: null,
    });
    await conversation_repository_1.conversationRepository.touchUpdatedAt(conversationId);
    const dto = (0, message_types_1.toMessageDTO)(message);
    (0, emitter_1.emitToConversation)(conversationId, 'message:new', dto);
    // Deliberately not awaited — message delivery must never wait on
    // translation (Section 30's lifecycle).
    (0, autoTranslate_1.scheduleTranslateForRecipients)(message.id, conversationId, senderId);
    return dto;
}
async function listMessages(conversationId, userId, options) {
    await assertParticipant(conversationId, userId);
    const limit = Math.min(options.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const messages = await message_repository_1.messageRepository.listByConversation(conversationId, {
        before: options.before,
        limit,
    });
    const requester = await user_repository_1.userRepository.findById(userId);
    const translations = requester
        ? await messageTranslation_repository_1.messageTranslationRepository.findManyByMessageIdsAndLanguage(messages.map((m) => m.id), requester.preferredLanguageCode)
        : [];
    const translationByMessageId = new Map(translations.map((t) => [t.messageId, t]));
    const nextCursor = messages.length === limit ? (messages[messages.length - 1]?.id ?? null) : null;
    return {
        messages: messages.map((m) => ({
            ...(0, message_types_1.toMessageDTO)(m),
            translation: translationByMessageId.has(m.id)
                ? (0, translation_types_1.toMessageTranslationDTO)(translationByMessageId.get(m.id))
                : null,
        })),
        nextCursor,
    };
}
async function getOwnedMessage(messageId, userId) {
    const message = await message_repository_1.messageRepository.findById(messageId);
    if (!message || message.deletedAt)
        throw AppError_1.AppError.notFound('Message not found', 'MESSAGE_NOT_FOUND');
    if (message.senderId !== userId) {
        throw AppError_1.AppError.forbidden('You can only modify your own messages', 'NOT_MESSAGE_OWNER');
    }
    return message;
}
async function editMessage(messageId, userId, content) {
    await getOwnedMessage(messageId, userId);
    const updated = await message_repository_1.messageRepository.updateContent(messageId, content);
    const dto = (0, message_types_1.toMessageDTO)(updated);
    (0, emitter_1.emitToConversation)(updated.conversationId, 'message:updated', dto);
    return dto;
}
async function deleteMessage(messageId, userId) {
    const message = await getOwnedMessage(messageId, userId);
    const deleted = await message_repository_1.messageRepository.softDelete(messageId);
    (0, emitter_1.emitToConversation)(message.conversationId, 'message:deleted', { id: deleted.id });
}
async function markDelivered(messageId, userId) {
    const message = await message_repository_1.messageRepository.findById(messageId);
    if (!message)
        return null;
    await assertParticipant(message.conversationId, userId);
    if (message.senderId === userId)
        return null; // can't "deliver" your own message to yourself
    const updated = await message_repository_1.messageRepository.markDelivered(messageId);
    if (!updated)
        return null;
    const dto = (0, message_types_1.toMessageDTO)(updated);
    (0, emitter_1.emitToConversation)(updated.conversationId, 'message:delivered', { id: dto.id, status: dto.status });
    return dto;
}
async function markReadUpTo(conversationId, userId, messageId) {
    await assertParticipant(conversationId, userId);
    const updatedCount = await message_repository_1.messageRepository.markReadUpTo(conversationId, userId, messageId);
    await conversation_repository_1.conversationRepository.updateLastRead(conversationId, userId, messageId);
    if (updatedCount > 0) {
        (0, emitter_1.emitToConversation)(conversationId, 'message:read', { conversationId, userId, upToMessageId: messageId });
    }
    return updatedCount;
}
exports.messageService = {
    sendMessage,
    listMessages,
    editMessage,
    deleteMessage,
    markDelivered,
    markReadUpTo,
};
//# sourceMappingURL=message.service.js.map