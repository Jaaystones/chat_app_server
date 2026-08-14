import { ConversationType } from '@prisma/client';
import { PublicUser } from './user.types';

export interface ConversationDTO {
  id: string;
  type: ConversationType;
  createdAt: Date;
  updatedAt: Date;
  participants: PublicUser[];
  // Convenience for the MVP's 1:1 UI (Section 8) — undefined for non-DIRECT types.
  otherParticipant?: PublicUser;
}
