import { Request, Response } from 'express';
import { translationService } from '../services/translation/translation.service';
import { messageRepository } from '../repositories/message.repository';
import { conversationRepository } from '../repositories/conversation.repository';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { TranslateMessageBody } from '../validation/translation.validation';

export const translate = asyncHandler(async (req: Request, res: Response) => {
  const { targetLanguage } = req.body as TranslateMessageBody;
  const messageId = req.params.id as string;

  const message = await messageRepository.findById(messageId);
  if (!message) throw AppError.notFound('Message not found', 'MESSAGE_NOT_FOUND');

  // 404 rather than 403 — consistent with conversation/message access elsewhere.
  const isParticipant = await conversationRepository.isParticipant(message.conversationId, req.userId as string);
  if (!isParticipant) throw AppError.notFound('Message not found', 'MESSAGE_NOT_FOUND');

  const translation = await translationService.translateMessage(messageId, targetLanguage);
  res.status(200).json({ translation });
});
