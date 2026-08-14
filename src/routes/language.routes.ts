import { Router } from 'express';
import * as languageController from '../controllers/language.controller';

export const languageRouter = Router();

// Public — needed on the registration screen, before a user has an access token.
languageRouter.get('/', languageController.list);
