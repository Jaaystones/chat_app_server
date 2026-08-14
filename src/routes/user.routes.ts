import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validate';
import { updateProfileSchema, searchQuerySchema } from '../validation/user.validation';

export const userRouter = Router();

userRouter.use(requireAuth);

userRouter.patch('/me', validateBody(updateProfileSchema), userController.updateMe);
// Must be registered before '/:id' — otherwise Express would match "search" as an :id.
userRouter.get('/search', validateQuery(searchQuerySchema), userController.search);
userRouter.get('/:id', userController.getById);
