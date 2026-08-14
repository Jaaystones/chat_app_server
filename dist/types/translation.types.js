"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toMessageTranslationDTO = toMessageTranslationDTO;
function toMessageTranslationDTO(row) {
    return {
        id: row.id,
        messageId: row.messageId,
        targetLanguage: row.targetLanguage,
        translatedContent: row.translatedContent,
        provider: row.provider,
        status: row.status,
        errorMessage: row.errorMessage,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
//# sourceMappingURL=translation.types.js.map