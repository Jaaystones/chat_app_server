"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTypingHandlers = registerTypingHandlers;
const conversation_repository_1 = require("../../repositories/conversation.repository");
function registerTypingHandlers(_io, socket) {
    const userId = socket.data.userId;
    async function broadcastIfMember(event, payload) {
        const isMember = await conversation_repository_1.conversationRepository.isParticipant(payload.conversationId, userId);
        if (!isMember)
            return;
        socket.to(`conversation:${payload.conversationId}`).emit(event, {
            conversationId: payload.conversationId,
            userId,
        });
    }
    socket.on('typing:start', (payload) => {
        void broadcastIfMember('typing:start', payload);
    });
    socket.on('typing:stop', (payload) => {
        void broadcastIfMember('typing:stop', payload);
    });
}
//# sourceMappingURL=typing.handlers.js.map