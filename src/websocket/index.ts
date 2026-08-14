import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redis } from '../config/redis';
import { env } from '../config/env';
import { socketAuthMiddleware } from './auth';
import { handleConnection } from './connection';

export interface SocketServer {
  io: Server;
  close: () => Promise<void>;
}

export function createSocketServer(httpServer: HttpServer): SocketServer {
  const io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
  });

  // Separate connections from the shared cache/denylist client — the adapter
  // needs dedicated pub/sub connections it fully controls.
  const pubClient = redis.duplicate();
  const subClient = redis.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  io.use(socketAuthMiddleware);
  io.on('connection', (socket) => {
    void handleConnection(io, socket);
  });

  async function close(): Promise<void> {
    await new Promise<void>((resolve) => io.close(() => resolve()));
    // .quit() drains in-flight commands before closing; .disconnect() would
    // abort them and throw "Connection is closed" from an untracked context.
    await Promise.all([pubClient.quit(), subClient.quit()]);
  }

  return { io, close };
}
