"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = require("./app");
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const prisma_1 = require("./config/prisma");
const redis_1 = require("./config/redis");
const websocket_1 = require("./websocket");
const emitter_1 = require("./websocket/emitter");
const app = (0, app_1.createApp)();
const server = http_1.default.createServer(app);
const socketServer = (0, websocket_1.createSocketServer)(server);
(0, emitter_1.setIO)(socketServer.io);
server.listen(env_1.env.PORT, () => {
    logger_1.logger.info(`LinguaBridge backend listening on port ${env_1.env.PORT}`, { env: env_1.env.NODE_ENV });
});
async function shutdown(signal) {
    logger_1.logger.info(`Received ${signal}, shutting down gracefully`);
    server.close(async () => {
        await socketServer.close();
        await prisma_1.prisma.$disconnect();
        await redis_1.redis.quit();
        process.exit(0);
    });
    setTimeout(() => {
        logger_1.logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error('Unhandled promise rejection', { reason });
});
//# sourceMappingURL=server.js.map