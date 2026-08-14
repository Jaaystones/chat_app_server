import { Request, Response } from 'express';
import { messageService } from '../services/messaging/message.service';
import { asyncHandler } from '../utils/asyncHandler';
import { SendMessageBody, EditMessageBody, ListMessagesQuery } from '../validation/message.validation';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { before, limit } = req.validatedQuery as ListMessagesQuery;
  const page = await messageService.listMessages(req.params.id as string, req.userId as string, {
    before,
    limit,
  });
  res.status(200).json(page);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const { content } = req.body as SendMessageBody;
  const message = await messageService.sendMessage(req.params.id as string, req.userId as string, content);
  res.status(201).json({ message });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const { content } = req.body as EditMessageBody;
  const message = await messageService.editMessage(req.params.id as string, req.userId as string, content);
  res.status(200).json({ message });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await messageService.deleteMessage(req.params.id as string, req.userId as string);
  res.status(204).send();
});
