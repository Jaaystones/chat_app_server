import { z } from 'zod';

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1, 'Message content is required').max(5000),
});

export const editMessageSchema = sendMessageSchema;

export const listMessagesQuerySchema = z.object({
  before: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type SendMessageBody = z.infer<typeof sendMessageSchema>;
export type EditMessageBody = z.infer<typeof editMessageSchema>;
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
