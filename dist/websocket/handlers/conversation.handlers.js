"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerConversationHandlers = registerConversationHandlers;
const conversation_repository_1 = require("../../repositories/conversation.repository");
// Rooms for existing conversations are auto-joined at connect time; this
// handler exists so a conversation created mid-session (via REST) can be
// joined without forcing a full socket reconnect.
function registerConversationHandlers(_io, socket) {
    const userId = socket.data.userId;
    socket.on('conversation:join', async (payload, callback) => {
        const isMember = await conversation_repository_1.conversationRepository.isParticipant(payload.conversationId, userId);
        if (!isMember) {
            callback?.({ ok: false, error: 'NOT_A_PARTICIPANT' });
            return;
        }
        socket.join(`conversation:${payload.conversationId}`);
        callback?.({ ok: true });
    });
    socket.on('conversation:leave', (payload) => {
        socket.leave(`conversation:${payload.conversationId}`);
    });
}
//# sourceMappingURL=conversation.handlers.js.map