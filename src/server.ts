import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';
import { redis } from './config/redis';
import { bootstrapDatabase } from './config/bootstrap';
import { createSocketServer } from './websocket';
import { setIO } from './websocket/emitter';

async function main() {
  await bootstrapDatabase();

  const app = createApp();
  const server = http.createServer(app);

  const socketServer = createSocketServer(server);
  setIO(socketServer.io);

  server.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`LinguaBridge backend listening on port ${env.PORT}`, { env: env.NODE_ENV });
  });

  async function shutdown(signal: string) {
    logger.info(`Received ${signal}, shutting down gracefully`);
    server.close(async () => {
      await socketServer.close();
      await prisma.$disconnect();
      await redis.quit();
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason });
  });
}

main().catch((err) => {
  logger.error('Failed to bootstrap backend', {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
