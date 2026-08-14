"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.translationCache = void 0;
const crypto_1 = __importDefault(require("crypto"));
const redis_1 = require("../../config/redis");
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
// Content-hash + target-language only (Section 15) — deliberately NOT scoped
// by user or message, since it's a pure function of (text, targetLanguage)
// and detection is deterministic for identical input. Never key this by
// user/conversation: that would either fragment the cache for no reason or,
// worse, invite leaking one user's cached translation into another's request.
function cacheKey(text, targetLanguage) {
    const hash = crypto_1.default.createHash('sha256').update(text).digest('hex');
    return `translation:${hash}:${targetLanguage}`;
}
async function get(text, targetLanguage) {
    const raw = await redis_1.redis.get(cacheKey(text, targetLanguage));
    if (!raw)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
async function set(text, targetLanguage, result) {
    await redis_1.redis.set(cacheKey(text, targetLanguage), JSON.stringify(result), 'EX', TTL_SECONDS);
}
exports.translationCache = { get, set };
//# sourceMappingURL=cache.js.map