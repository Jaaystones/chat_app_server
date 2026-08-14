import { Request, Response } from 'express';
import { userService } from '../services/users/user.service';
import { asyncHandler } from '../utils/asyncHandler';
import { UpdateProfileBody, SearchQuery } from '../validation/user.validation';

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as UpdateProfileBody;
  const user = await userService.updateProfile(req.userId as string, body);
  res.status(200).json({ user });
});

export const search = asyncHandler(async (req: Request, res: Response) => {
  const { q } = req.validatedQuery as SearchQuery;
  const users = await userService.search(q, req.userId as string);
  res.status(200).json({ users });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getById(req.params.id as string);
  res.status(200).json({ user });
});
