import { Server, Socket } from 'socket.io';
import { conversationRepository } from '../repositories/conversation.repository';
import { userRepository } from '../repositories/user.repository';
import { logger } from '../config/logger';
import { presence } from './presence';
import { registerConversationHandlers } from './handlers/conversation.handlers';
import { registerTypingHandlers } from './handlers/typing.handlers';
import { registerMessageHandlers } from './handlers/message.handlers';

export async function handleConnection(io: Server, socket: Socket): Promise<void> {
  const userId = socket.data.userId as string;

  socket.join(`user:${userId}`);

  const conversationIds = await conversationRepository.listIdsForUser(userId);
  conversationIds.forEach((id) => socket.join(`conversation:${id}`));

  registerConversationHandlers(io, socket);
  registerTypingHandlers(io, socket);
  registerMessageHandlers(io, socket);

  try {
    const count = await presence.incrementConnection(userId);
    if (count === 1) {
      await userRepository.updateStatus(userId, 'ONLINE');
      conversationIds.forEach((id) => io.to(`conversation:${id}`).emit('user:online', { userId }));
    }
  } catch (err) {
    logger.error('Failed to update presence on connect', { error: (err as Error).message });
  }

  // The client's 'connect' event fires once the transport handshake completes,
  // independent of how long this async setup takes — a client could otherwise
  // believe it's ready and miss broadcasts sent before room joins finish here.
  socket.emit('ready');

  socket.on('disconnect', async () => {
    try {
      const remaining = await presence.decrementConnection(userId);
      if (remaining === 0) {
        const lastSeen = new Date();
        await userRepository.updateStatus(userId, 'OFFLINE', lastSeen);
        // Recomputed rather than reusing the connect-time snapshot, in case a
        // conversation was created (and its room joined) mid-session.
        const currentConversationIds = await conversationRepository.listIdsForUser(userId);
        currentConversationIds.forEach((id) =>
          io.to(`conversation:${id}`).emit('user:offline', { userId, lastSeen }),
        );
      }
    } catch (err) {
      logger.error('Failed to update presence on disconnect', { error: (err as Error).message });
    }
  });
}
