import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate';
import { registerSchema, loginSchema } from '../validation/auth.validation';

export const authRouter = Router();

// Brute-force protection on credential-guessing endpoints. Broader API-wide
// rate limiting is deferred to production hardening (Phase 8).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

authRouter.post('/register', authLimiter, validateBody(registerSchema), authController.register);
authRouter.post('/login', authLimiter, validateBody(loginSchema), authController.login);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authController.logout);
authRouter.get('/me', requireAuth, authController.me);
