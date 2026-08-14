"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const redis_1 = require("../config/redis");
exports.healthRouter = (0, express_1.Router)();
exports.healthRouter.get('/', async (_req, res) => {
    const [dbOk, redisOk] = await Promise.all([
        prisma_1.prisma.$queryRaw `SELECT 1`.then(() => true).catch(() => false),
        redis_1.redis
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
//# sourceMappingURL=health.routes.js.map