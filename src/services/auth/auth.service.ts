import bcrypt from 'bcryptjs';
import { userRepository } from '../../repositories/user.repository';
import { languageRepository } from '../../repositories/language.repository';
import { tokenService } from './token.service';
import { AppError } from '../../utils/AppError';
import { PublicUser, toPublicUser } from '../../types/user.types';

const BCRYPT_COST = 12;

export interface RegisterInput {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  preferredLanguage: string;
  country?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

async function assertLanguageIsUsable(code: string): Promise<void> {
  const language = await languageRepository.findByCode(code);
  if (!language || !language.isActive) {
    throw AppError.badRequest(`"${code}" is not a supported language`, 'UNSUPPORTED_LANGUAGE');
  }
}

async function register(input: RegisterInput): Promise<{ user: PublicUser } & AuthTokens> {
  await assertLanguageIsUsable(input.preferredLanguage);

  const [existingEmail, existingUsername] = await Promise.all([
    userRepository.findByEmail(input.email),
    userRepository.findByUsername(input.username),
  ]);
  if (existingEmail) throw AppError.conflict('Email is already registered', 'EMAIL_TAKEN');
  if (existingUsername) throw AppError.conflict('Username is already taken', 'USERNAME_TAKEN');

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

  const user = await userRepository.create({
    firstName: input.firstName,
    lastName: input.lastName,
    username: input.username,
    email: input.email,
    passwordHash,
    country: input.country,
    preferredLanguage: { connect: { code: input.preferredLanguage } },
  });

  const accessToken = tokenService.signAccessToken(user.id);
  const { token: refreshToken } = tokenService.signRefreshToken(user.id);

  return { user: toPublicUser(user), accessToken, refreshToken };
}

async function login(identifier: string, password: string): Promise<{ user: PublicUser } & AuthTokens> {
  const user = await userRepository.findByEmailOrUsername(identifier);
  if (!user) throw AppError.unauthorized('Invalid email/username or password', 'INVALID_CREDENTIALS');

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw AppError.unauthorized('Invalid email/username or password', 'INVALID_CREDENTIALS');
  }

  const accessToken = tokenService.signAccessToken(user.id);
  const { token: refreshToken } = tokenService.signRefreshToken(user.id);

  return { user: toPublicUser(user), accessToken, refreshToken };
}

async function refresh(refreshToken: string): Promise<AuthTokens> {
  const payload = await tokenService.verifyAndCheckRefreshToken(refreshToken);

  const user = await userRepository.findById(payload.sub);
  if (!user) throw AppError.unauthorized('User no longer exists', 'USER_NOT_FOUND');

  // Rotate: the presented refresh token is single-use.
  await tokenService.revokeRefreshToken(payload, tokenService.getRemainingSeconds(refreshToken));

  const accessToken = tokenService.signAccessToken(user.id);
  const { token: newRefreshToken } = tokenService.signRefreshToken(user.id);

  return { accessToken, refreshToken: newRefreshToken };
}

async function logout(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return;
  try {
    const payload = await tokenService.verifyAndCheckRefreshToken(refreshToken);
    await tokenService.revokeRefreshToken(payload, tokenService.getRemainingSeconds(refreshToken));
  } catch {
    // Token already invalid/expired/revoked — logout is idempotent either way.
  }
}

export const authService = {
  register,
  login,
  refresh,
  logout,
};
