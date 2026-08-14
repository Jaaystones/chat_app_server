import { Server, Socket } from 'socket.io';
import { conversationRepository } from '../../repositories/conversation.repository';

interface ConversationRoomPayload {
  conversationId: string;
}

type JoinAck = (response: { ok: boolean; error?: string }) => void;

// Rooms for existing conversations are auto-joined at connect time; this
// handler exists so a conversation created mid-session (via REST) can be
// joined without forcing a full socket reconnect.
export function registerConversationHandlers(_io: Server, socket: Socket): void {
  const userId = socket.data.userId as string;

  socket.on('conversation:join', async (payload: ConversationRoomPayload, callback?: JoinAck) => {
    const isMember = await conversationRepository.isParticipant(payload.conversationId, userId);
    if (!isMember) {
      callback?.({ ok: false, error: 'NOT_A_PARTICIPANT' });
      return;
    }
    socket.join(`conversation:${payload.conversationId}`);
    callback?.({ ok: true });
  });

  socket.on('conversation:leave', (payload: ConversationRoomPayload) => {
    socket.leave(`conversation:${payload.conversationId}`);
  });
}
