import { z } from 'zod';

export const updateProfileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    preferredLanguage: z.string().trim().toLowerCase().min(2).max(10).optional(),
    country: z.string().trim().min(1).max(100).optional(),
    avatarUrl: z.string().trim().url().optional(),
    autoTranslate: z.boolean().optional(),
    showOriginalByDefault: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Search query is required').max(100),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
