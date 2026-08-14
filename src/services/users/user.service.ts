import { Prisma } from '@prisma/client';
import { userRepository } from '../../repositories/user.repository';
import { languageRepository } from '../../repositories/language.repository';
import { AppError } from '../../utils/AppError';
import { PublicUser, toPublicUser } from '../../types/user.types';

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  preferredLanguage?: string;
  country?: string;
  avatarUrl?: string;
  autoTranslate?: boolean;
  showOriginalByDefault?: boolean;
}

async function getById(userId: string): Promise<PublicUser> {
  const user = await userRepository.findById(userId);
  if (!user) throw AppError.notFound('User not found', 'USER_NOT_FOUND');
  return toPublicUser(user);
}

async function updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
  if (input.preferredLanguage) {
    const language = await languageRepository.findByCode(input.preferredLanguage);
    if (!language || !language.isActive) {
      throw AppError.badRequest(
        `"${input.preferredLanguage}" is not a supported language`,
        'UNSUPPORTED_LANGUAGE',
      );
    }
  }

  const data: Prisma.UserUpdateInput = {
    firstName: input.firstName,
    lastName: input.lastName,
    country: input.country,
    avatarUrl: input.avatarUrl,
    autoTranslate: input.autoTranslate,
    showOriginalByDefault: input.showOriginalByDefault,
  };
  if (input.preferredLanguage) {
    data.preferredLanguage = { connect: { code: input.preferredLanguage } };
  }

  const user = await userRepository.update(userId, data);
  return toPublicUser(user);
}

async function search(query: string, excludeUserId: string): Promise<PublicUser[]> {
  const users = await userRepository.search(query, excludeUserId);
  return users.map(toPublicUser);
}

export const userService = {
  getById,
  updateProfile,
  search,
};
