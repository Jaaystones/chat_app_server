import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { healthRouter } from './routes/health.routes';
import { authRouter } from './routes/auth.routes';
import { userRouter } from './routes/user.routes';
import { conversationRouter } from './routes/conversation.routes';
import { messageRouter } from './routes/message.routes';
import { languageRouter } from './routes/language.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use('/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', userRouter);
  app.use('/api/conversations', conversationRouter);
  app.use('/api/messages', messageRouter);
  app.use('/api/languages', languageRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
