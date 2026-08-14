import { Message, MessageStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

export interface CreateMessageInput {
  conversationId: string;
  senderId: string;
  originalContent: string;
  detectedLanguage?: string | null;
}

export interface ListMessagesOptions {
  before?: string; // message id cursor — return messages strictly older than this one
  limit: number;
}

export const messageRepository = {
  create(input: CreateMessageInput): Promise<Message> {
    return prisma.message.create({
      data: {
        conversationId: input.conversationId,
        senderId: input.senderId,
        originalContent: input.originalContent,
        detectedLanguage: input.detectedLanguage,
      },
    });
  },

  findById(id: string): Promise<Message | null> {
    return prisma.message.findUnique({ where: { id } });
  },

  // Newest-first with a compound (createdAt, id) ordering so pagination stays
  // stable even if two messages share a millisecond timestamp.
  listByConversation(conversationId: string, options: ListMessagesOptions): Promise<Message[]> {
    const orderBy: Prisma.MessageOrderByWithRelationInput[] = [{ createdAt: 'desc' }, { id: 'desc' }];
    return prisma.message.findMany({
      where: { conversationId },
      orderBy,
      take: options.limit,
      ...(options.before ? { cursor: { id: options.before }, skip: 1 } : {}),
    });
  },

  updateContent(id: string, content: string): Promise<Message> {
    return prisma.message.update({
      where: { id },
      data: { originalContent: content, editedAt: new Date() },
    });
  },

  softDelete(id: string): Promise<Message> {
    return prisma.message.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  updateDetectedLanguage(id: string, detectedLanguage: string): Promise<Message> {
    return prisma.message.update({ where: { id }, data: { detectedLanguage } });
  },

  // Only advances SENT -> DELIVERED; never regresses an already-READ message.
  async markDelivered(id: string): Promise<Message | null> {
    const result = await prisma.message.updateMany({
      where: { id, status: MessageStatus.SENT },
      data: { status: MessageStatus.DELIVERED },
    });
    if (result.count === 0) return null;
    return prisma.message.findUnique({ where: { id } });
  },

  // Marks every not-yet-read message from other senders, up to and including
  // the given message's timestamp, as READ. Returns how many rows changed.
  async markReadUpTo(conversationId: string, readerId: string, uptoMessageId: string): Promise<number> {
    const target = await prisma.message.findUnique({
      where: { id: uptoMessageId },
      select: { createdAt: true },
    });
    if (!target) return 0;

    const result = await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: readerId },
        status: { not: MessageStatus.READ },
        createdAt: { lte: target.createdAt },
      },
      data: { status: MessageStatus.READ },
    });
    return result.count;
  },
};
