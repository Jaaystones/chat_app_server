"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSocketServer = createSocketServer;
const socket_io_1 = require("socket.io");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const redis_1 = require("../config/redis");
const env_1 = require("../config/env");
const auth_1 = require("./auth");
const connection_1 = require("./connection");
function createSocketServer(httpServer) {
    const io = new socket_io_1.Server(httpServer, {
        cors: { origin: env_1.env.CORS_ORIGIN, credentials: true },
    });
    // Separate connections from the shared cache/denylist client — the adapter
    // needs dedicated pub/sub connections it fully controls.
    const pubClient = redis_1.redis.duplicate();
    const subClient = redis_1.redis.duplicate();
    io.adapter((0, redis_adapter_1.createAdapter)(pubClient, subClient));
    io.use(auth_1.socketAuthMiddleware);
    io.on('connection', (socket) => {
        void (0, connection_1.handleConnection)(io, socket);
    });
    async function close() {
        await new Promise((resolve) => io.close(() => resolve()));
        // .quit() drains in-flight commands before closing; .disconnect() would
        // abort them and throw "Connection is closed" from an untracked context.
        await Promise.all([pubClient.quit(), subClient.quit()]);
    }
    return { io, close };
}
//# sourceMappingURL=index.js.map