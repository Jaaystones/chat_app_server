import { Request, Response } from 'express';
import { conversationService } from '../services/conversations/conversation.service';
import { asyncHandler } from '../utils/asyncHandler';
import { CreateConversationBody } from '../validation/conversation.validation';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const { participantId } = req.body as CreateConversationBody;
  const { conversation, created } = await conversationService.createDirect(
    req.userId as string,
    participantId,
  );
  res.status(created ? 201 : 200).json({ conversation });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const conversations = await conversationService.listForUser(req.userId as string);
  res.status(200).json({ conversations });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const conversation = await conversationService.getByIdForUser(req.params.id as string, req.userId as string);
  res.status(200).json({ conversation });
});
