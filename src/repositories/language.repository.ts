import { Language } from '@prisma/client';
import { prisma } from '../config/prisma';

export const languageRepository = {
  findByCode(code: string): Promise<Language | null> {
    return prisma.language.findUnique({ where: { code } });
  },

  listActive(): Promise<Language[]> {
    return prisma.language.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  },
};
