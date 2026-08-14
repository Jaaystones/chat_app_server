// `./env` must be imported before `@prisma/client` — Prisma's generated
// client auto-loads a plain `.env` on first require (independent of
// NODE_ENV), and since dotenv never overrides an already-set key, whichever
// loader runs first wins for every variable, not just Prisma's own. Importing
// our NODE_ENV-aware env.ts first ensures ours wins and Prisma's own load
// becomes a harmless no-op.
import { env } from './env';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
