import { prisma } from './src/config/prisma';
import { redis } from './src/config/redis';
import { waitForPendingAutoTranslations } from './src/services/messaging/autoTranslate';

// Auto-translation runs fire-and-forget after message send (by design — see
// autoTranslate.ts). Draining it after every test, not just at the end,
// keeps one test's background job from racing the next test's resetDb().
afterEach(async () => {
  await waitForPendingAutoTranslations();
});

afterAll(async () => {
  await waitForPendingAutoTranslations();
  await prisma.$disconnect();
  await redis.quit();
});
