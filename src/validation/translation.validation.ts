import { z } from 'zod';

export const translateMessageSchema = z.object({
  targetLanguage: z.string().trim().toLowerCase().min(2).max(10),
});

export type TranslateMessageBody = z.infer<typeof translateMessageSchema>;
