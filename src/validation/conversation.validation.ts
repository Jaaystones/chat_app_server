import { z } from 'zod';

export const createConversationSchema = z.object({
  participantId: z.string().trim().min(1, 'participantId is required'),
});

export type CreateConversationBody = z.infer<typeof createConversationSchema>;
