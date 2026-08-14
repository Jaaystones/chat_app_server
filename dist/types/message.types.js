"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toMessageDTO = toMessageDTO;
function toMessageDTO(message) {
    const deleted = message.deletedAt !== null;
    return {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        // Deleted messages keep their row (for scroll-position/pagination
        // stability) but never expose content again (Rule 7 is about never
        // losing the original — it doesn't require re-serving it once deleted).
        originalContent: deleted ? null : message.originalContent,
        detectedLanguage: message.detectedLanguage,
        messageType: message.messageType,
        status: message.status,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        editedAt: message.editedAt,
        deletedAt: message.deletedAt,
    };
}
//# sourceMappingURL=message.types.js.map