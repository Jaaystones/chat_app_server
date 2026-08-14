import { Server, Socket } from 'socket.io';
import { conversationRepository } from '../../repositories/conversation.repository';

interface TypingPayload {
  conversationId: string;
}

export function registerTypingHandlers(_io: Server, socket: Socket): void {
  const userId = socket.data.userId as string;

  async function broadcastIfMember(event: 'typing:start' | 'typing:stop', payload: TypingPayload) {
    const isMember = await conversationRepository.isParticipant(payload.conversationId, userId);
    if (!isMember) return;
    socket.to(`conversation:${payload.conversationId}`).emit(event, {
      conversationId: payload.conversationId,
      userId,
    });
  }

  socket.on('typing:start', (payload: TypingPayload) => {
    void broadcastIfMember('typing:start', payload);
  });

  socket.on('typing:stop', (payload: TypingPayload) => {
    void broadcastIfMember('typing:stop', payload);
  });
}
