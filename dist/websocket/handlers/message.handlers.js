"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMessageHandlers = registerMessageHandlers;
const message_service_1 = require("../../services/messaging/message.service");
const AppError_1 = require("../../utils/AppError");
const logger_1 = require("../../config/logger");
function registerMessageHandlers(_io, socket) {
    const userId = socket.data.userId;
    socket.on('message:send', async (payload, callback) => {
        try {
            const message = await message_service_1.messageService.sendMessage(payload.conversationId, userId, payload.content);
            callback?.({ ok: true, message });
        }
        catch (err) {
            if (err instanceof AppError_1.AppError) {
                callback?.({ ok: false, error: err.code });
                return;
            }
            logger_1.logger.error('message:send failed', { error: err.message });
            callback?.({ ok: false, error: 'INTERNAL_ERROR' });
        }
    });
    socket.on('message:delivered', async (payload) => {
        try {
            await message_service_1.messageService.markDelivered(payload.messageId, userId);
        }
        catch (err) {
            logger_1.logger.error('message:delivered failed', { error: err.message });
        }
    });
    socket.on('message:read', async (payload) => {
        try {
            await message_service_1.messageService.markReadUpTo(payload.conversationId, userId, payload.messageId);
        }
        catch (err) {
            logger_1.logger.error('message:read failed', { error: err.message });
        }
    });
}
//# sourceMappingURL=message.handlers.js.map