"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const token_service_1 = require("../services/auth/token.service");
const AppError_1 = require("../utils/AppError");
function requireAuth(req, _res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        next(AppError_1.AppError.unauthorized('Missing access token', 'MISSING_ACCESS_TOKEN'));
        return;
    }
    const token = header.slice('Bearer '.length);
    try {
        const payload = token_service_1.tokenService.verifyAccessToken(token);
        req.userId = payload.sub;
        next();
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=auth.middleware.js.map