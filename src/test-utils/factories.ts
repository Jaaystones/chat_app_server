import { Message, User } from '@prisma/client';
import { userRepository } from '../repositories/user.repository';
import { conversationRepository } from '../repositories/conversation.repository';
import { messageRepository } from '../repositories/message.repository';

let counter = 0;

export async function createTestUser(
  overrides: Partial<{
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    preferredLanguage: string;
    country: string;
  }> = {},
): Promise<User> {
  counter += 1;
  const n = counter;

  return userRepository.create({
    firstName: overrides.firstName ?? `Test${n}`,
    lastName: overrides.lastName ?? `User${n}`,
    username: overrides.username ?? `test_user_${n}`,
    email: overrides.email ?? `test-user-${n}@example.com`,
    // Not a real bcrypt hash — fine since these tests never exercise login.
    passwordHash: 'unused-in-tests',
    country: overrides.country,
    preferredLanguage: { connect: { code: overrides.preferredLanguage ?? 'en' } },
  });
}

export async function createTestMessage(overrides: {
  senderId: string;
  recipientId: string;
  originalContent?: string;
}): Promise<Message> {
  const conversation = await conversationRepository.createDirect(overrides.senderId, overrides.recipientId);
  return messageRepository.create({
    conversationId: conversation.id,
    senderId: overrides.senderId,
    originalContent: overrides.originalContent ?? 'Hello, this is a test message.',
  });
}
