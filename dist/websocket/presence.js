"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presence = void 0;
const redis_1 = require("../config/redis");
const KEY_PREFIX = 'presence:conns:';
// Tracks concurrent socket connections per user (multiple tabs/devices) so a
// single tab closing doesn't incorrectly mark the user offline while another
// tab is still connected.
async function incrementConnection(userId) {
    return redis_1.redis.incr(`${KEY_PREFIX}${userId}`);
}
async function decrementConnection(userId) {
    const count = await redis_1.redis.decr(`${KEY_PREFIX}${userId}`);
    if (count <= 0) {
        await redis_1.redis.del(`${KEY_PREFIX}${userId}`);
        return 0;
    }
    return count;
}
exports.presence = {
    incrementConnection,
    decrementConnection,
};
//# sourceMappingURL=presence.js.map