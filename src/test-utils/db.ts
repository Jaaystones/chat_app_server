import { prisma } from '../config/prisma';

export async function resetDb(): Promise<void> {
  await prisma.messageTranslation.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.user.deleteMany();
}
