import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

const withParticipants = {
  participants: { include: { user: true } },
} satisfies Prisma.ConversationInclude;

export type ConversationWithParticipants = Prisma.ConversationGetPayload<{
  include: typeof withParticipants;
}>;

export const conversationRepository = {
  // Check-then-create; a rare concurrent double-post could in theory create two
  // DIRECT conversations for the same pair. Acceptable at MVP scale (Rule 1) —
  // revisit with a DB-level constraint if it proves to matter in practice.
  findDirectBetween(userIdA: string, userIdB: string): Promise<ConversationWithParticipants | null> {
    return prisma.conversation.findFirst({
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

  createDirect(userIdA: string, userIdB: string): Promise<ConversationWithParticipants> {
    return prisma.conversation.create({
      data: {
        type: 'DIRECT',
        participants: { create: [{ userId: userIdA }, { userId: userIdB }] },
      },
      include: withParticipants,
    });
  },

  findById(id: string): Promise<ConversationWithParticipants | null> {
    return prisma.conversation.findUnique({ where: { id }, include: withParticipants });
  },

  findAllForUser(userId: string): Promise<ConversationWithParticipants[]> {
    return prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: withParticipants,
      orderBy: { updatedAt: 'desc' },
    });
  },

  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      select: { id: true },
    });
    return participant !== null;
  },

  async listIdsForUser(userId: string): Promise<string[]> {
    const rows = await prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true },
    });
    return rows.map((r) => r.conversationId);
  },

  touchUpdatedAt(conversationId: string): Promise<{ id: string }> {
    return prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
      select: { id: true },
    });
  },

  updateLastRead(conversationId: string, userId: string, messageId: string): Promise<{ id: string }> {
    return prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadMessageId: messageId },
      select: { id: true },
    });
  },

  async getParticipantLanguagePrefs(
    conversationId: string,
  ): Promise<{ userId: string; preferredLanguageCode: string; autoTranslate: boolean }[]> {
    const rows = await prisma.conversationParticipant.findMany({
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
