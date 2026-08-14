"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translate = void 0;
const translation_service_1 = require("../services/translation/translation.service");
const message_repository_1 = require("../repositories/message.repository");
const conversation_repository_1 = require("../repositories/conversation.repository");
const AppError_1 = require("../utils/AppError");
const asyncHandler_1 = require("../utils/asyncHandler");
exports.translate = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { targetLanguage } = req.body;
    const messageId = req.params.id;
    const message = await message_repository_1.messageRepository.findById(messageId);
    if (!message)
        throw AppError_1.AppError.notFound('Message not found', 'MESSAGE_NOT_FOUND');
    // 404 rather than 403 — consistent with conversation/message access elsewhere.
    const isParticipant = await conversation_repository_1.conversationRepository.isParticipant(message.conversationId, req.userId);
    if (!isParticipant)
        throw AppError_1.AppError.notFound('Message not found', 'MESSAGE_NOT_FOUND');
    const translation = await translation_service_1.translationService.translateMessage(messageId, targetLanguage);
    res.status(200).json({ translation });
});
//# sourceMappingURL=translation.controller.js.map