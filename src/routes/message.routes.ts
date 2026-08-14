import { Router } from 'express';
import * as messageController from '../controllers/message.controller';
import * as translationController from '../controllers/translation.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate';
import { editMessageSchema } from '../validation/message.validation';
import { translateMessageSchema } from '../validation/translation.validation';

export const messageRouter = Router();

messageRouter.use(requireAuth);

messageRouter.patch('/:id', validateBody(editMessageSchema), messageController.update);
messageRouter.delete('/:id', messageController.remove);
messageRouter.post('/:id/translate', validateBody(translateMessageSchema), translationController.translate);
