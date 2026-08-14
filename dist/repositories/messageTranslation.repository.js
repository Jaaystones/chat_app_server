"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageTranslationRepository = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../config/prisma");
exports.messageTranslationRepository = {
    findByMessageAndLanguage(messageId, targetLanguage) {
        return prisma_1.prisma.messageTranslation.findUnique({
            where: { messageId_targetLanguage: { messageId, targetLanguage } },
        });
    },
    // Batched for message-history pagination — one query per page, not one per message.
    findManyByMessageIdsAndLanguage(messageIds, targetLanguage) {
        if (messageIds.length === 0)
            return Promise.resolve([]);
        return prisma_1.prisma.messageTranslation.findMany({
            where: { messageId: { in: messageIds }, targetLanguage },
        });
    },
    upsertCompleted(messageId, targetLanguage, translatedContent, provider) {
        return prisma_1.prisma.messageTranslation.upsert({
            where: { messageId_targetLanguage: { messageId, targetLanguage } },
            update: { translatedContent, provider, status: client_1.TranslationStatus.COMPLETED, errorMessage: null },
            create: { messageId, targetLanguage, translatedContent, provider, status: client_1.TranslationStatus.COMPLETED },
        });
    },
    upsertFailed(messageId, targetLanguage, provider, errorMessage) {
        return prisma_1.prisma.messageTranslation.upsert({
            where: { messageId_targetLanguage: { messageId, targetLanguage } },
            update: { status: client_1.TranslationStatus.FAILED, errorMessage, provider },
            create: { messageId, targetLanguage, provider, status: client_1.TranslationStatus.FAILED, errorMessage },
        });
    },
};
//# sourceMappingURL=messageTranslation.repository.js.map