import { Router } from 'express';
import { prisma } from '../config/prisma';
import { redis } from '../config/redis';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  const [dbOk, redisOk] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    redis
      .ping()
      .then(() => true)
      .catch(() => false),
  ]);

  const healthy = dbOk && redisOk;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    database: dbOk ? 'up' : 'down',
    redis: redisOk ? 'up' : 'down',
    timestamp: new Date().toISOString(),
  });
});
