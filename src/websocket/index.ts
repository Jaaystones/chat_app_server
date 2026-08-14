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
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
  });

  const pubClient = redis.duplicate();
  const subClient = redis.duplicate();

  pubClient.on('error', (err) => {
    console.error('Redis pub client error:', err.message);
  });

  subClient.on('error', (err) => {
    console.error('Redis sub client error:', err.message);
  });

  io.adapter(createAdapter(pubClient, subClient));

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    void handleConnection(io, socket);
  });

  async function close(): Promise<void> {
    await new Promise<void>((resolve) => {
      io.close(() => resolve());
    });

    await Promise.all([
      pubClient.quit(),
      subClient.quit(),
    ]);
  }

  return {
    io,
    close,
  };
}