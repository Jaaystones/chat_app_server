import { Server, Socket } from 'socket.io';
import { messageService } from '../../services/messaging/message.service';
import { AppError } from '../../utils/AppError';
import { logger } from '../../config/logger';

interface SendPayload {
  conversationId: string;
  content: string;
}

interface DeliveredPayload {
  messageId: string;
}

interface ReadPayload {
  conversationId: string;
  messageId: string;
}

type SendAck = (response: { ok: boolean; message?: unknown; error?: string }) => void;

export function registerMessageHandlers(_io: Server, socket: Socket): void {
  const userId = socket.data.userId as string;

  socket.on('message:send', async (payload: SendPayload, callback?: SendAck) => {
    try {
      const message = await messageService.sendMessage(payload.conversationId, userId, payload.content);
      callback?.({ ok: true, message });
    } catch (err) {
      if (err instanceof AppError) {
        callback?.({ ok: false, error: err.code });
        return;
      }
      logger.error('message:send failed', { error: (err as Error).message });
      callback?.({ ok: false, error: 'INTERNAL_ERROR' });
    }
  });

  socket.on('message:delivered', async (payload: DeliveredPayload) => {
    try {
      await messageService.markDelivered(payload.messageId, userId);
    } catch (err) {
      logger.error('message:delivered failed', { error: (err as Error).message });
    }
  });

  socket.on('message:read', async (payload: ReadPayload) => {
    try {
      await messageService.markReadUpTo(payload.conversationId, userId, payload.messageId);
    } catch (err) {
      logger.error('message:read failed', { error: (err as Error).message });
    }
  });
}
