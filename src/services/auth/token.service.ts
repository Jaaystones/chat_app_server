import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { redis } from '../../config/redis';
import { AppError } from '../../utils/AppError';
import { AccessTokenPayload, RefreshTokenPayload } from '../../types/auth.types';

const REVOKED_KEY_PREFIX = 'revoked-refresh:';

function signAccessToken(userId: string): string {
  const payload: AccessTokenPayload = { sub: userId, jti: crypto.randomUUID() };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as jwt.SignOptions);
}

function signRefreshToken(userId: string): { token: string; jti: string } {
  const jti = crypto.randomUUID();
  const payload: RefreshTokenPayload = { sub: userId, jti };
  const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
  return { token, jti };
}

function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  } catch {
    throw AppError.unauthorized('Invalid or expired access token', 'INVALID_ACCESS_TOKEN');
  }
}

function verifyRefreshTokenSignature(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }
}

async function assertRefreshTokenNotRevoked(jti: string): Promise<void> {
  const revoked = await redis.get(`${REVOKED_KEY_PREFIX}${jti}`);
  if (revoked) {
    throw AppError.unauthorized('Refresh token has been revoked', 'REFRESH_TOKEN_REVOKED');
  }
}

async function revokeRefreshToken(payload: RefreshTokenPayload, expSeconds?: number): Promise<void> {
  // Fall back to the configured lifetime if the token had no readable exp claim.
  const ttlSeconds = expSeconds ?? 60 * 60 * 24 * 30;
  await redis.set(`${REVOKED_KEY_PREFIX}${payload.jti}`, '1', 'EX', Math.max(ttlSeconds, 1));
}

/** Verifies signature, checks the denylist, and returns the decoded payload. */
async function verifyAndCheckRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const payload = verifyRefreshTokenSignature(token);
  await assertRefreshTokenNotRevoked(payload.jti);
  return payload;
}

function getRemainingSeconds(token: string): number | undefined {
  const decoded = jwt.decode(token) as (RefreshTokenPayload & { exp?: number }) | null;
  if (!decoded?.exp) return undefined;
  return decoded.exp - Math.floor(Date.now() / 1000);
}

export const tokenService = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyAndCheckRefreshToken,
  revokeRefreshToken,
  getRemainingSeconds,
};
