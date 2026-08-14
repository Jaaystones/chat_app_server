import { Router } from 'express';
import * as conversationController from '../controllers/conversation.controller';
import * as messageController from '../controllers/message.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validate';
import { createConversationSchema } from '../validation/conversation.validation';
import { sendMessageSchema, listMessagesQuerySchema } from '../validation/message.validation';

export const conversationRouter = Router();

conversationRouter.use(requireAuth);

conversationRouter.get('/', conversationController.list);
conversationRouter.post('/', validateBody(createConversationSchema), conversationController.create);
conversationRouter.get('/:id', conversationController.getById);

conversationRouter.get('/:id/messages', validateQuery(listMessagesQuerySchema), messageController.list);
conversationRouter.post(
  '/:id/messages',
  validateBody(sendMessageSchema),
  messageController.create,
);
