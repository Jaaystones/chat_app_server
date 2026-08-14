import { Request, Response } from 'express';
import { languageRepository } from '../repositories/language.repository';
import { asyncHandler } from '../utils/asyncHandler';
import { languageSeedData } from '../config/languageSeedData';

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const languages = await languageRepository.listActive().catch(() =>
    languageSeedData.map((lang) => ({
      id: lang.code,
      code: lang.code,
      name: lang.name,
      nativeName: lang.nativeName,
      isActive: true,
      translationSupported: lang.translationSupported,
      voiceSupported: false,
      createdAt: new Date(),
    })),
  );
  res.status(200).json({ languages });
});
