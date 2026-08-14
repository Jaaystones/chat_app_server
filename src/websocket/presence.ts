import { redis } from '../config/redis';

const KEY_PREFIX = 'presence:conns:';

// Tracks concurrent socket connections per user (multiple tabs/devices) so a
// single tab closing doesn't incorrectly mark the user offline while another
// tab is still connected.
async function incrementConnection(userId: string): Promise<number> {
  return redis.incr(`${KEY_PREFIX}${userId}`);
}

async function decrementConnection(userId: string): Promise<number> {
  const count = await redis.decr(`${KEY_PREFIX}${userId}`);
  if (count <= 0) {
    await redis.del(`${KEY_PREFIX}${userId}`);
    return 0;
  }
  return count;
}

export const presence = {
  incrementConnection,
  decrementConnection,
};
