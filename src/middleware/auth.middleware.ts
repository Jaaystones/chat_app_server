import { NextFunction, Request, Response } from 'express';
import { tokenService } from '../services/auth/token.service';
import { AppError } from '../utils/AppError';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(AppError.unauthorized('Missing access token', 'MISSING_ACCESS_TOKEN'));
    return;
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = tokenService.verifyAccessToken(token);
    req.userId = payload.sub;
    next();
  } catch (err) {
    next(err);
  }
}
