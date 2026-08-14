import { randomUUID } from 'crypto';
import { prisma } from './prisma';
import { languageSeedData } from './languageSeedData';

export async function bootstrapDatabase() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "languages" (
      "id" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "nativeName" TEXT NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "translationSupported" BOOLEAN NOT NULL DEFAULT false,
      "voiceSupported" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
    )
  `);

  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "languages_code_key" ON "languages"("code")`,
  );

  for (const lang of languageSeedData) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: { ...lang, isActive: true },
      create: { id: randomUUID(), ...lang, isActive: true },
    });
  }
}