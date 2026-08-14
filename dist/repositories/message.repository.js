"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageRepository = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../config/prisma");
exports.messageRepository = {
    create(input) {
        return prisma_1.prisma.message.create({
            data: {
                conversationId: input.conversationId,
                senderId: input.senderId,
                originalContent: input.originalContent,
                detectedLanguage: input.detectedLanguage,
            },
        });
    },
    findById(id) {
        return prisma_1.prisma.message.findUnique({ where: { id } });
    },
    // Newest-first with a compound (createdAt, id) ordering so pagination stays
    // stable even if two messages share a millisecond timestamp.
    listByConversation(conversationId, options) {
        const orderBy = [{ createdAt: 'desc' }, { id: 'desc' }];
        return prisma_1.prisma.message.findMany({
            where: { conversationId },
            orderBy,
            take: options.limit,
            ...(options.before ? { cursor: { id: options.before }, skip: 1 } : {}),
        });
    },
    updateContent(id, content) {
        return prisma_1.prisma.message.update({
            where: { id },
            data: { originalContent: content, editedAt: new Date() },
        });
    },
    softDelete(id) {
        return prisma_1.prisma.message.update({ where: { id }, data: { deletedAt: new Date() } });
    },
    updateDetectedLanguage(id, detectedLanguage) {
        return prisma_1.prisma.message.update({ where: { id }, data: { detectedLanguage } });
    },
    // Only advances SENT -> DELIVERED; never regresses an already-READ message.
    async markDelivered(id) {
        const result = await prisma_1.prisma.message.updateMany({
            where: { id, status: client_1.MessageStatus.SENT },
            data: { status: client_1.MessageStatus.DELIVERED },
        });
        if (result.count === 0)
            return null;
        return prisma_1.prisma.message.findUnique({ where: { id } });
    },
    // Marks every not-yet-read message from other senders, up to and including
    // the given message's timestamp, as READ. Returns how many rows changed.
    async markReadUpTo(conversationId, readerId, uptoMessageId) {
        const target = await prisma_1.prisma.message.findUnique({
            where: { id: uptoMessageId },
            select: { createdAt: true },
        });
        if (!target)
            return 0;
        const result = await prisma_1.prisma.message.updateMany({
            where: {
                conversationId,
                senderId: { not: readerId },
                status: { not: client_1.MessageStatus.READ },
                createdAt: { lte: target.createdAt },
            },
            data: { status: client_1.MessageStatus.READ },
        });
        return result.count;
    },
};
//# sourceMappingURL=message.repository.js.map