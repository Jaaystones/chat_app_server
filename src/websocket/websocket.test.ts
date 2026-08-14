import { createServer, Server as HttpServer } from 'http';
import { AddressInfo } from 'net';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { createApp } from '../app';
import { createSocketServer, SocketServer } from './index';
import { setIO, clearIO } from './emitter';
import { resetDb } from '../test-utils/db';
import { createTestUser } from '../test-utils/factories';
import { tokenService } from '../services/auth/token.service';
import { conversationRepository } from '../repositories/conversation.repository';
import { userRepository } from '../repositories/user.repository';
import { conversationService } from '../services/conversations/conversation.service';

let httpServer: HttpServer;
let socketServer: SocketServer;
let baseUrl: string;
const openClients: ClientSocket[] = [];

beforeAll(async () => {
  const app = createApp();
  httpServer = createServer(app);
  socketServer = createSocketServer(httpServer);
  setIO(socketServer.io);

  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const { port } = httpServer.address() as AddressInfo;
  baseUrl = `http://localhost:${port}`;
});

afterAll(async () => {
  clearIO();
  await socketServer.close();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

beforeEach(async () => {
  await resetDb();
});

afterEach(async () => {
  // Wait for each client to actually finish disconnecting, then give the
  // server's async disconnect handler (presence + DB update) a moment to run
  // — otherwise it can still be in flight when the next test's resetDb() (or
  // final teardown's redis.disconnect()) runs out from under it.
  await Promise.all(
    openClients.map(
      (s) =>
        new Promise<void>((resolve) => {
          if (s.disconnected) {
            resolve();
            return;
          }
          s.once('disconnect', () => resolve());
          s.disconnect();
        }),
    ),
  );
  openClients.length = 0;
  await new Promise((resolve) => setTimeout(resolve, 100));
});

function connectClient(token: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(baseUrl, { auth: { token }, transports: ['websocket'], forceNew: true });
    // Wait for 'ready' (emitted after server-side room joins/presence setup),
    // not just 'connect' — see the comment in connection.ts for why.
    socket.once('ready', () => {
      openClients.push(socket);
      resolve(socket);
    });
    socket.once('connect_error', (err) => reject(err));
  });
}

function connectRaw(token?: string): ClientSocket {
  const socket = ioClient(baseUrl, {
    auth: token ? { token } : {},
    transports: ['websocket'],
    forceNew: true,
  });
  openClients.push(socket);
  return socket;
}

function waitForEvent<T = unknown>(socket: ClientSocket, event: string, timeoutMs = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), timeoutMs);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

async function setupConversation(usernameA: string, usernameB: string) {
  const userA = await createTestUser({ username: usernameA, preferredLanguage: 'en' });
  const userB = await createTestUser({ username: usernameB, preferredLanguage: 'fr' });
  const conversation = await conversationRepository.createDirect(userA.id, userB.id);
  return { userA, userB, conversationId: conversation.id };
}

describe('WebSocket auth', () => {
  it('rejects a connection with no token', async () => {
    const socket = connectRaw();
    const err = await waitForEvent(socket, 'connect_error');
    expect(err).toBeDefined();
  });

  it('rejects a connection with an invalid token', async () => {
    const socket = connectRaw('not-a-real-token');
    const err = await waitForEvent(socket, 'connect_error');
    expect(err).toBeDefined();
  });
});

describe('message events', () => {
  it('delivers message:new to the other participant in real time', async () => {
    const { userA, userB, conversationId } = await setupConversation('ws_alice1', 'ws_bob1');
    const socketA = await connectClient(tokenService.signAccessToken(userA.id));
    const socketB = await connectClient(tokenService.signAccessToken(userB.id));

    const received = waitForEvent<{ originalContent: string; conversationId: string }>(
      socketB,
      'message:new',
    );
    socketA.emit('message:send', { conversationId, content: 'Hello Bob' });

    const message = await received;
    expect(message.originalContent).toBe('Hello Bob');
    expect(message.conversationId).toBe(conversationId);
  });

  it('acks message:send with the persisted message', async () => {
    const { userA, conversationId } = await setupConversation('ws_alice2', 'ws_bob2');
    const socketA = await connectClient(tokenService.signAccessToken(userA.id));

    const ack = await new Promise<{ ok: boolean; message?: { originalContent: string } }>((resolve) => {
      socketA.emit('message:send', { conversationId, content: 'ack test' }, resolve);
    });

    expect(ack.ok).toBe(true);
    expect(ack.message?.originalContent).toBe('ack test');
  });

  it('rejects message:send for a conversation the sender is not part of', async () => {
    const { conversationId } = await setupConversation('ws_alice3', 'ws_bob3');
    const outsider = await createTestUser({ username: 'ws_outsider3' });
    const outsiderSocket = await connectClient(tokenService.signAccessToken(outsider.id));

    const ack = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
      outsiderSocket.emit('message:send', { conversationId, content: 'sneaky' }, resolve);
    });

    expect(ack.ok).toBe(false);
    expect(ack.error).toBe('CONVERSATION_NOT_FOUND');
  });

  it('marks a message delivered and read, broadcasting status updates to the sender', async () => {
    const { userA, userB, conversationId } = await setupConversation('ws_alice5', 'ws_bob5');
    const socketA = await connectClient(tokenService.signAccessToken(userA.id));
    const socketB = await connectClient(tokenService.signAccessToken(userB.id));

    const ack = await new Promise<{ message: { id: string } }>((resolve) => {
      socketA.emit('message:send', { conversationId, content: 'read me' }, resolve);
    });
    const messageId = ack.message.id;

    const delivered = waitForEvent<{ id: string; status: string }>(socketA, 'message:delivered');
    socketB.emit('message:delivered', { messageId });
    const deliveredPayload = await delivered;
    expect(deliveredPayload.status).toBe('DELIVERED');

    const read = waitForEvent<{ upToMessageId: string; userId: string }>(socketA, 'message:read');
    socketB.emit('message:read', { conversationId, messageId });
    const readPayload = await read;
    expect(readPayload.upToMessageId).toBe(messageId);
    expect(readPayload.userId).toBe(userB.id);
  });
});

describe('typing indicators', () => {
  it('broadcasts typing:start/stop to the other participant, not the sender', async () => {
    const { userA, userB, conversationId } = await setupConversation('ws_alice4', 'ws_bob4');
    const socketA = await connectClient(tokenService.signAccessToken(userA.id));
    const socketB = await connectClient(tokenService.signAccessToken(userB.id));

    const selfHeard = { value: false };
    socketA.once('typing:start', () => {
      selfHeard.value = true;
    });

    const typingStart = waitForEvent<{ conversationId: string; userId: string }>(socketB, 'typing:start');
    socketA.emit('typing:start', { conversationId });
    const startPayload = await typingStart;
    expect(startPayload.userId).toBe(userA.id);
    expect(selfHeard.value).toBe(false);

    const typingStop = waitForEvent(socketB, 'typing:stop');
    socketA.emit('typing:stop', { conversationId });
    await typingStop;
  });
});

describe('presence', () => {
  it('emits user:online on connect and user:offline (with a stale DB update) on disconnect', async () => {
    const { userA, userB } = await setupConversation('ws_alice6', 'ws_bob6');
    const socketA = await connectClient(tokenService.signAccessToken(userA.id));

    const onlineEvent = waitForEvent<{ userId: string }>(socketA, 'user:online');
    const socketB = await connectClient(tokenService.signAccessToken(userB.id));
    const onlinePayload = await onlineEvent;
    expect(onlinePayload.userId).toBe(userB.id);

    const offlineEvent = waitForEvent<{ userId: string }>(socketA, 'user:offline');
    socketB.disconnect();
    const offlinePayload = await offlineEvent;
    expect(offlinePayload.userId).toBe(userB.id);

    const user = await userRepository.findById(userB.id);
    expect(user?.status).toBe('OFFLINE');
  });

  it('does not go offline while a second tab/connection is still open', async () => {
    const { userA, userB } = await setupConversation('ws_alice9', 'ws_bob9');
    const socketA = await connectClient(tokenService.signAccessToken(userA.id));
    const tokenB = tokenService.signAccessToken(userB.id);

    const firstOnline = waitForEvent(socketA, 'user:online');
    const socketB1 = await connectClient(tokenB);
    await firstOnline;

    // Second tab for the same user — no additional user:online broadcast expected.
    const socketB2 = await connectClient(tokenB);

    let unexpectedOffline = false;
    socketA.once('user:offline', () => {
      unexpectedOffline = true;
    });

    socketB1.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(unexpectedOffline).toBe(false);

    const user = await userRepository.findById(userB.id);
    expect(user?.status).toBe('ONLINE');

    socketB2.disconnect();
  });
});

describe('automatic translation events', () => {
  it('broadcasts message:translation:ready once auto-translation completes', async () => {
    // setupConversation gives userA 'en' and userB 'fr' — different
    // preferred languages, so auto-translation should fire for userB.
    const { userA, conversationId } = await setupConversation('ws_alice10', 'ws_bob10');
    const socketA = await connectClient(tokenService.signAccessToken(userA.id));

    const ack = await new Promise<{ message: { id: string } }>((resolve) => {
      socketA.emit('message:send', { conversationId, content: 'Hello Bob' }, resolve);
    });

    const ready = await waitForEvent<{
      messageId: string;
      targetLanguage: string;
      translatedContent: string;
      status: string;
    }>(socketA, 'message:translation:ready', 5000);

    expect(ready.messageId).toBe(ack.message.id);
    expect(ready.targetLanguage).toBe('fr');
    expect(ready.status).toBe('COMPLETED');
    expect(ready.translatedContent).toBe('[fr] Hello Bob');
  });

  it('broadcasts message:translation:failed for a recipient whose language is unsupported', async () => {
    const userA = await createTestUser({ username: 'ws_alice11', preferredLanguage: 'en' });
    const userB = await createTestUser({ username: 'ws_bob11', preferredLanguage: 'yo' });
    const conversation = await conversationRepository.createDirect(userA.id, userB.id);
    const socketA = await connectClient(tokenService.signAccessToken(userA.id));

    socketA.emit('message:send', { conversationId: conversation.id, content: 'Hello Bob' });

    const failed = await waitForEvent<{ targetLanguage: string; status: string; errorMessage: string }>(
      socketA,
      'message:translation:failed',
      5000,
    );

    expect(failed.targetLanguage).toBe('yo');
    expect(failed.status).toBe('FAILED');
    expect(failed.errorMessage).toBe('UNSUPPORTED_LANGUAGE');
  });

  it('emits no translation event at all when sender and recipient share a preferred language', async () => {
    const userA = await createTestUser({ username: 'ws_alice12', preferredLanguage: 'en' });
    const userB = await createTestUser({ username: 'ws_bob12', preferredLanguage: 'en' });
    const conversation = await conversationRepository.createDirect(userA.id, userB.id);
    const socketA = await connectClient(tokenService.signAccessToken(userA.id));

    let sawTranslationEvent = false;
    socketA.once('message:translation:ready', () => {
      sawTranslationEvent = true;
    });
    socketA.once('message:translation:failed', () => {
      sawTranslationEvent = true;
    });

    socketA.emit('message:send', { conversationId: conversation.id, content: 'Hello Bob' });
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(sawTranslationEvent).toBe(false);
  });
});

describe('conversation:join / conversation:leave', () => {
  it('lets a socket subscribe to a conversation created after connecting', async () => {
    const userA = await createTestUser({ username: 'ws_alice7' });
    const userB = await createTestUser({ username: 'ws_bob7' });
    const socketA = await connectClient(tokenService.signAccessToken(userA.id));
    const socketB = await connectClient(tokenService.signAccessToken(userB.id));

    // Created AFTER both sockets connected — neither has auto-joined its room.
    const conversation = await conversationRepository.createDirect(userA.id, userB.id);

    const joinAckB = await new Promise<{ ok: boolean }>((resolve) => {
      socketB.emit('conversation:join', { conversationId: conversation.id }, resolve);
    });
    expect(joinAckB.ok).toBe(true);

    const received = waitForEvent<{ originalContent: string }>(socketB, 'message:new');
    await new Promise<{ ok: boolean }>((resolve) => {
      socketA.emit('conversation:join', { conversationId: conversation.id }, resolve);
    });
    socketA.emit('message:send', { conversationId: conversation.id, content: 'post-join' });

    const message = await received;
    expect(message.originalContent).toBe('post-join');
  });

  it('delivers message:new to an already-connected recipient for a brand-new conversation, with no conversation:join', async () => {
    // Regression test: a conversation created via the service layer (i.e. the
    // real POST /api/conversations path) must proactively join both
    // participants' already-connected sockets to its room. Previously, only
    // the creator's client ever called conversation:join (from opening the
    // chat window), so a recipient connected before the conversation existed
    // would never receive its events until their next reconnect.
    const userA = await createTestUser({ username: 'ws_alice13' });
    const userB = await createTestUser({ username: 'ws_bob13' });
    const socketA = await connectClient(tokenService.signAccessToken(userA.id));
    const socketB = await connectClient(tokenService.signAccessToken(userB.id));

    const { conversation } = await conversationService.createDirect(userA.id, userB.id);

    const received = waitForEvent<{ originalContent: string }>(socketB, 'message:new');
    socketA.emit('message:send', { conversationId: conversation.id, content: 'surprise!' });

    const message = await received;
    expect(message.originalContent).toBe('surprise!');
  });

  it('rejects conversation:join for a conversation the socket is not part of', async () => {
    const { conversationId } = await setupConversation('ws_alice8', 'ws_bob8');
    const outsider = await createTestUser({ username: 'ws_outsider8' });
    const outsiderSocket = await connectClient(tokenService.signAccessToken(outsider.id));

    const joinAck = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
      outsiderSocket.emit('conversation:join', { conversationId }, resolve);
    });

    expect(joinAck.ok).toBe(false);
    expect(joinAck.error).toBe('NOT_A_PARTICIPANT');
  });
});
