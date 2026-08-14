"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conversationRepository = void 0;
const prisma_1 = require("../config/prisma");
const withParticipants = {
    participants: { include: { user: true } },
};
exports.conversationRepository = {
    // Check-then-create; a rare concurrent double-post could in theory create two
    // DIRECT conversations for the same pair. Acceptable at MVP scale (Rule 1) —
    // revisit with a DB-level constraint if it proves to matter in practice.
    findDirectBetween(userIdA, userIdB) {
        return prisma_1.prisma.conversation.findFirst({
            where: {
                type: 'DIRECT',
                AND: [
                    { participants: { some: { userId: userIdA } } },
                    { participants: { some: { userId: userIdB } } },
                ],
            },
            include: withParticipants,
        });
    },
    createDirect(userIdA, userIdB) {
        return prisma_1.prisma.conversation.create({
            data: {
                type: 'DIRECT',
                participants: { create: [{ userId: userIdA }, { userId: userIdB }] },
            },
            include: withParticipants,
        });
    },
    findById(id) {
        return prisma_1.prisma.conversation.findUnique({ where: { id }, include: withParticipants });
    },
    findAllForUser(userId) {
        return prisma_1.prisma.conversation.findMany({
            where: { participants: { some: { userId } } },
            include: withParticipants,
            orderBy: { updatedAt: 'desc' },
        });
    },
    async isParticipant(conversationId, userId) {
        const participant = await prisma_1.prisma.conversationParticipant.findUnique({
            where: { conversationId_userId: { conversationId, userId } },
            select: { id: true },
        });
        return participant !== null;
    },
    async listIdsForUser(userId) {
        const rows = await prisma_1.prisma.conversationParticipant.findMany({
            where: { userId },
            select: { conversationId: true },
        });
        return rows.map((r) => r.conversationId);
    },
    touchUpdatedAt(conversationId) {
        return prisma_1.prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
            select: { id: true },
        });
    },
    updateLastRead(conversationId, userId, messageId) {
        return prisma_1.prisma.conversationParticipant.update({
            where: { conversationId_userId: { conversationId, userId } },
            data: { lastReadMessageId: messageId },
            select: { id: true },
        });
    },
    async getParticipantLanguagePrefs(conversationId) {
        const rows = await prisma_1.prisma.conversationParticipant.findMany({
            where: { conversationId },
            select: {
                userId: true,
                user: { select: { preferredLanguageCode: true, autoTranslate: true } },
            },
        });
        return rows.map((r) => ({
            userId: r.userId,
            preferredLanguageCode: r.user.preferredLanguageCode,
            autoTranslate: r.user.autoTranslate,
        }));
    },
};
//# sourceMappingURL=conversation.repository.js.map