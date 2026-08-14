"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketAuthMiddleware = socketAuthMiddleware;
const token_service_1 = require("../services/auth/token.service");
function socketAuthMiddleware(socket, next) {
    const token = socket.handshake.auth?.token;
    if (!token) {
        next(new Error('UNAUTHORIZED'));
        return;
    }
    try {
        const payload = token_service_1.tokenService.verifyAccessToken(token);
        socket.data.userId = payload.sub;
        next();
    }
    catch {
        next(new Error('UNAUTHORIZED'));
    }
}
//# sourceMappingURL=auth.js.map