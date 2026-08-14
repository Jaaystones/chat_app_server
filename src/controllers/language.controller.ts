import { Request, Response } from 'express';
import { languageRepository } from '../repositories/language.repository';
import { asyncHandler } from '../utils/asyncHandler';

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const languages = await languageRepository.listActive();
  res.status(200).json({ languages });
});
