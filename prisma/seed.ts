import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// translationSupported reflects what the MVP's mock/DeepL provider can actually
// handle today (Section 26) — flip to true only once verified against the live
// provider, not based on aspiration.
const languages = [
  { code: 'en', name: 'English', nativeName: 'English', translationSupported: true },
  { code: 'fr', name: 'French', nativeName: 'Français', translationSupported: true },
  { code: 'es', name: 'Spanish', nativeName: 'Español', translationSupported: true },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', translationSupported: true },
  { code: 'de', name: 'German', nativeName: 'Deutsch', translationSupported: true },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', translationSupported: true },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá', translationSupported: false },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa', translationSupported: false },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo', translationSupported: false },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', translationSupported: false },
  { code: 'tw', name: 'Twi', nativeName: 'Twi', translationSupported: false },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', translationSupported: false },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', translationSupported: false },
  { code: 'wo', name: 'Wolof', nativeName: 'Wolof', translationSupported: false },
];

async function main() {
  for (const lang of languages) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: { ...lang, isActive: true },
      create: { ...lang, isActive: true },
    });
  }
  console.log(`Seeded ${languages.length} languages`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
