"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = void 0;
const user_repository_1 = require("../../repositories/user.repository");
const language_repository_1 = require("../../repositories/language.repository");
const AppError_1 = require("../../utils/AppError");
const user_types_1 = require("../../types/user.types");
async function getById(userId) {
    const user = await user_repository_1.userRepository.findById(userId);
    if (!user)
        throw AppError_1.AppError.notFound('User not found', 'USER_NOT_FOUND');
    return (0, user_types_1.toPublicUser)(user);
}
async function updateProfile(userId, input) {
    if (input.preferredLanguage) {
        const language = await language_repository_1.languageRepository.findByCode(input.preferredLanguage);
        if (!language || !language.isActive) {
            throw AppError_1.AppError.badRequest(`"${input.preferredLanguage}" is not a supported language`, 'UNSUPPORTED_LANGUAGE');
        }
    }
    const data = {
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
    const user = await user_repository_1.userRepository.update(userId, data);
    return (0, user_types_1.toPublicUser)(user);
}
async function search(query, excludeUserId) {
    const users = await user_repository_1.userRepository.search(query, excludeUserId);
    return users.map(user_types_1.toPublicUser);
}
exports.userService = {
    getById,
    updateProfile,
    search,
};
//# sourceMappingURL=user.service.js.map