import { Server } from 'socket.io';
import { logger } from '../config/logger';

let io: Server | undefined;

export function setIO(server: Server): void {
  io = server;
}

// Used by tests to fully reset state between runs.
export function clearIO(): void {
  io = undefined;
}

// The messaging system must keep working even when no socket server is
// attached (e.g. REST-only contexts, tests) — real-time delivery is an
// enhancement, not a hard dependency for persisting a message.
export function emitToConversation(conversationId: string, event: string, payload: unknown): void {
  if (!io) {
    logger.debug('Socket.IO not initialized; skipping emit', { event });
    return;
  }
  io.to(`conversation:${conversationId}`).emit(event, payload);
}

export function getIO(): Server | undefined {
  return io;
}

// A brand-new conversation has no room yet, and the only client that will
// think to `conversation:join` it is whoever's actively viewing that chat —
// i.e. the creator. A recipient who is already connected (but hasn't opened
// this conversation, since they don't know it exists) would otherwise never
// receive its events until their next reconnect. Every connected socket for
// a user already sits in `user:{id}`, so we use that as the address book to
// pull all of that user's live sockets (every tab/device) into the new room.
export function joinConversationRoom(conversationId: string, userIds: string[]): void {
  if (!io) {
    logger.debug('Socket.IO not initialized; skipping room join', { conversationId });
    return;
  }
  const room = `conversation:${conversationId}`;
  userIds.forEach((userId) => {
    io!.in(`user:${userId}`).socketsJoin(room);
  });
}
