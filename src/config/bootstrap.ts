import { execFileSync } from 'child_process';
import { prisma } from './prisma';
import { languageSeedData } from './languageSeedData';

export async function bootstrapDatabase() {
  execFileSync('./node_modules/.bin/prisma', ['migrate', 'deploy'], {
    stdio: 'inherit',
  });

  for (const lang of languageSeedData) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: { ...lang, isActive: true },
      create: { ...lang, isActive: true },
    });
  }
}