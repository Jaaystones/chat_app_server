import { PrismaClient } from '@prisma/client';
import { languageSeedData } from '../src/config/languageSeedData';

const prisma = new PrismaClient();

async function main() {
  for (const lang of languageSeedData) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: { ...lang, isActive: true },
      create: { ...lang, isActive: true },
    });
  }
  console.log(`Seeded ${languageSeedData.length} languages`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
