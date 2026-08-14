"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleConnection = handleConnection;
const conversation_repository_1 = require("../repositories/conversation.repository");
const user_repository_1 = require("../repositories/user.repository");
const logger_1 = require("../config/logger");
const presence_1 = require("./presence");
const conversation_handlers_1 = require("./handlers/conversation.handlers");
const typing_handlers_1 = require("./handlers/typing.handlers");
const message_handlers_1 = require("./handlers/message.handlers");
async function handleConnection(io, socket) {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);
    const conversationIds = await conversation_repository_1.conversationRepository.listIdsForUser(userId);
    conversationIds.forEach((id) => socket.join(`conversation:${id}`));
    (0, conversation_handlers_1.registerConversationHandlers)(io, socket);
    (0, typing_handlers_1.registerTypingHandlers)(io, socket);
    (0, message_handlers_1.registerMessageHandlers)(io, socket);
    try {
        const count = await presence_1.presence.incrementConnection(userId);
        if (count === 1) {
            await user_repository_1.userRepository.updateStatus(userId, 'ONLINE');
            conversationIds.forEach((id) => io.to(`conversation:${id}`).emit('user:online', { userId }));
        }
    }
    catch (err) {
        logger_1.logger.error('Failed to update presence on connect', { error: err.message });
    }
    // The client's 'connect' event fires once the transport handshake completes,
    // independent of how long this async setup takes — a client could otherwise
    // believe it's ready and miss broadcasts sent before room joins finish here.
    socket.emit('ready');
    socket.on('disconnect', async () => {
        try {
            const remaining = await presence_1.presence.decrementConnection(userId);
            if (remaining === 0) {
                const lastSeen = new Date();
                await user_repository_1.userRepository.updateStatus(userId, 'OFFLINE', lastSeen);
                // Recomputed rather than reusing the connect-time snapshot, in case a
                // conversation was created (and its room joined) mid-session.
                const currentConversationIds = await conversation_repository_1.conversationRepository.listIdsForUser(userId);
                currentConversationIds.forEach((id) => io.to(`conversation:${id}`).emit('user:offline', { userId, lastSeen }));
            }
        }
        catch (err) {
            logger_1.logger.error('Failed to update presence on disconnect', { error: err.message });
        }
    });
}
//# sourceMappingURL=connection.js.map