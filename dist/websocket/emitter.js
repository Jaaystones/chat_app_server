"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setIO = setIO;
exports.clearIO = clearIO;
exports.emitToConversation = emitToConversation;
exports.getIO = getIO;
const logger_1 = require("../config/logger");
let io;
function setIO(server) {
    io = server;
}
// Used by tests to fully reset state between runs.
function clearIO() {
    io = undefined;
}
// The messaging system must keep working even when no socket server is
// attached (e.g. REST-only contexts, tests) — real-time delivery is an
// enhancement, not a hard dependency for persisting a message.
function emitToConversation(conversationId, event, payload) {
    if (!io) {
        logger_1.logger.debug('Socket.IO not initialized; skipping emit', { event });
        return;
    }
    io.to(`conversation:${conversationId}`).emit(event, payload);
}
function getIO() {
    return io;
}
//# sourceMappingURL=emitter.js.map