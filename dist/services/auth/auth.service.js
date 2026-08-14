"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const user_repository_1 = require("../../repositories/user.repository");
const language_repository_1 = require("../../repositories/language.repository");
const token_service_1 = require("./token.service");
const AppError_1 = require("../../utils/AppError");
const user_types_1 = require("../../types/user.types");
const BCRYPT_COST = 12;
async function assertLanguageIsUsable(code) {
    const language = await language_repository_1.languageRepository.findByCode(code);
    if (!language || !language.isActive) {
        throw AppError_1.AppError.badRequest(`"${code}" is not a supported language`, 'UNSUPPORTED_LANGUAGE');
    }
}
async function register(input) {
    await assertLanguageIsUsable(input.preferredLanguage);
    const [existingEmail, existingUsername] = await Promise.all([
        user_repository_1.userRepository.findByEmail(input.email),
        user_repository_1.userRepository.findByUsername(input.username),
    ]);
    if (existingEmail)
        throw AppError_1.AppError.conflict('Email is already registered', 'EMAIL_TAKEN');
    if (existingUsername)
        throw AppError_1.AppError.conflict('Username is already taken', 'USERNAME_TAKEN');
    const passwordHash = await bcryptjs_1.default.hash(input.password, BCRYPT_COST);
    const user = await user_repository_1.userRepository.create({
        firstName: input.firstName,
        lastName: input.lastName,
        username: input.username,
        email: input.email,
        passwordHash,
        country: input.country,
        preferredLanguage: { connect: { code: input.preferredLanguage } },
    });
    const accessToken = token_service_1.tokenService.signAccessToken(user.id);
    const { token: refreshToken } = token_service_1.tokenService.signRefreshToken(user.id);
    return { user: (0, user_types_1.toPublicUser)(user), accessToken, refreshToken };
}
async function login(identifier, password) {
    const user = await user_repository_1.userRepository.findByEmailOrUsername(identifier);
    if (!user)
        throw AppError_1.AppError.unauthorized('Invalid email/username or password', 'INVALID_CREDENTIALS');
    const passwordMatches = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!passwordMatches) {
        throw AppError_1.AppError.unauthorized('Invalid email/username or password', 'INVALID_CREDENTIALS');
    }
    const accessToken = token_service_1.tokenService.signAccessToken(user.id);
    const { token: refreshToken } = token_service_1.tokenService.signRefreshToken(user.id);
    return { user: (0, user_types_1.toPublicUser)(user), accessToken, refreshToken };
}
async function refresh(refreshToken) {
    const payload = await token_service_1.tokenService.verifyAndCheckRefreshToken(refreshToken);
    const user = await user_repository_1.userRepository.findById(payload.sub);
    if (!user)
        throw AppError_1.AppError.unauthorized('User no longer exists', 'USER_NOT_FOUND');
    // Rotate: the presented refresh token is single-use.
    await token_service_1.tokenService.revokeRefreshToken(payload, token_service_1.tokenService.getRemainingSeconds(refreshToken));
    const accessToken = token_service_1.tokenService.signAccessToken(user.id);
    const { token: newRefreshToken } = token_service_1.tokenService.signRefreshToken(user.id);
    return { accessToken, refreshToken: newRefreshToken };
}
async function logout(refreshToken) {
    if (!refreshToken)
        return;
    try {
        const payload = await token_service_1.tokenService.verifyAndCheckRefreshToken(refreshToken);
        await token_service_1.tokenService.revokeRefreshToken(payload, token_service_1.tokenService.getRemainingSeconds(refreshToken));
    }
    catch {
        // Token already invalid/expired/revoked — logout is idempotent either way.
    }
}
exports.authService = {
    register,
    login,
    refresh,
    logout,
};
//# sourceMappingURL=auth.service.js.map