"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../../config/env");
const redis_1 = require("../../config/redis");
const AppError_1 = require("../../utils/AppError");
const REVOKED_KEY_PREFIX = 'revoked-refresh:';
function signAccessToken(userId) {
    const payload = { sub: userId, jti: crypto_1.default.randomUUID() };
    return jsonwebtoken_1.default.sign(payload, env_1.env.JWT_ACCESS_SECRET, { expiresIn: env_1.env.JWT_ACCESS_EXPIRES_IN });
}
function signRefreshToken(userId) {
    const jti = crypto_1.default.randomUUID();
    const payload = { sub: userId, jti };
    const token = jsonwebtoken_1.default.sign(payload, env_1.env.JWT_REFRESH_SECRET, {
        expiresIn: env_1.env.JWT_REFRESH_EXPIRES_IN,
    });
    return { token, jti };
}
function verifyAccessToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, env_1.env.JWT_ACCESS_SECRET);
    }
    catch {
        throw AppError_1.AppError.unauthorized('Invalid or expired access token', 'INVALID_ACCESS_TOKEN');
    }
}
function verifyRefreshTokenSignature(token) {
    try {
        return jsonwebtoken_1.default.verify(token, env_1.env.JWT_REFRESH_SECRET);
    }
    catch {
        throw AppError_1.AppError.unauthorized('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
    }
}
async function assertRefreshTokenNotRevoked(jti) {
    const revoked = await redis_1.redis.get(`${REVOKED_KEY_PREFIX}${jti}`);
    if (revoked) {
        throw AppError_1.AppError.unauthorized('Refresh token has been revoked', 'REFRESH_TOKEN_REVOKED');
    }
}
async function revokeRefreshToken(payload, expSeconds) {
    // Fall back to the configured lifetime if the token had no readable exp claim.
    const ttlSeconds = expSeconds ?? 60 * 60 * 24 * 30;
    await redis_1.redis.set(`${REVOKED_KEY_PREFIX}${payload.jti}`, '1', 'EX', Math.max(ttlSeconds, 1));
}
/** Verifies signature, checks the denylist, and returns the decoded payload. */
async function verifyAndCheckRefreshToken(token) {
    const payload = verifyRefreshTokenSignature(token);
    await assertRefreshTokenNotRevoked(payload.jti);
    return payload;
}
function getRemainingSeconds(token) {
    const decoded = jsonwebtoken_1.default.decode(token);
    if (!decoded?.exp)
        return undefined;
    return decoded.exp - Math.floor(Date.now() / 1000);
}
exports.tokenService = {
    signAccessToken,
    signRefreshToken,
    verifyAccessToken,
    verifyAndCheckRefreshToken,
    revokeRefreshToken,
    getRemainingSeconds,
};
//# sourceMappingURL=token.service.js.map