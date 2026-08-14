"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.me = exports.logout = exports.refresh = exports.login = exports.register = void 0;
const auth_service_1 = require("../services/auth/auth.service");
const user_service_1 = require("../services/users/user.service");
const AppError_1 = require("../utils/AppError");
const asyncHandler_1 = require("../utils/asyncHandler");
const env_1 = require("../config/env");
const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_PATH = '/api/auth';
function setRefreshCookie(res, token) {
    res.cookie(REFRESH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: env_1.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: REFRESH_COOKIE_PATH,
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });
}
function clearRefreshCookie(res) {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
}
exports.register = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = req.body;
    const { user, accessToken, refreshToken } = await auth_service_1.authService.register(body);
    setRefreshCookie(res, refreshToken);
    res.status(201).json({ user, accessToken });
});
exports.login = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = req.body;
    const { user, accessToken, refreshToken } = await auth_service_1.authService.login(body.identifier, body.password);
    setRefreshCookie(res, refreshToken);
    res.status(200).json({ user, accessToken });
});
exports.refresh = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token)
        throw AppError_1.AppError.unauthorized('Missing refresh token', 'MISSING_REFRESH_TOKEN');
    const { accessToken, refreshToken } = await auth_service_1.authService.refresh(token);
    setRefreshCookie(res, refreshToken);
    res.status(200).json({ accessToken });
});
exports.logout = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    await auth_service_1.authService.logout(token);
    clearRefreshCookie(res);
    res.status(204).send();
});
exports.me = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await user_service_1.userService.getById(req.userId);
    res.status(200).json({ user });
});
//# sourceMappingURL=auth.controller.js.map