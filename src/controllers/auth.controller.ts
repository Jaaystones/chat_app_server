import { Request, Response } from 'express';
import { authService } from '../services/auth/auth.service';
import { userService } from '../services/users/user.service';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { env } from '../config/env';
import { RegisterBody, LoginBody } from '../validation/auth.validation';

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_PATH = '/api/auth';

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as RegisterBody;
  const { user, accessToken, refreshToken } = await authService.register(body);
  setRefreshCookie(res, refreshToken);
  res.status(201).json({ user, accessToken });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as LoginBody;
  const { user, accessToken, refreshToken } = await authService.login(body.identifier, body.password);
  setRefreshCookie(res, refreshToken);
  res.status(200).json({ user, accessToken });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) throw AppError.unauthorized('Missing refresh token', 'MISSING_REFRESH_TOKEN');

  const { accessToken, refreshToken } = await authService.refresh(token);
  setRefreshCookie(res, refreshToken);
  res.status(200).json({ accessToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  await authService.logout(token);
  clearRefreshCookie(res);
  res.status(204).send();
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getById(req.userId as string);
  res.status(200).json({ user });
});
