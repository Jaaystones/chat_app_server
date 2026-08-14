import { TranslationProvider, TranslateParams, TranslateResult } from '../types';

// Not real translation — a deterministic stand-in requiring no external
// service, used when TRANSLATION_PROVIDER=mock (the default). Detection is a
// small real heuristic (not hardcoded to one answer) so tests can exercise
// the "detected language differs from target" path honestly.
const DETECTION_HINTS: [string, RegExp][] = [
  ['ar', /[؀-ۿ]/],
  ['fr', /\b(bonjour|merci|s'il vous pla[iî]t|comment allez|je suis|avec vous)\b/i],
  ['es', /\b(hola|gracias|por favor|cómo está|estoy|con usted)\b/i],
  ['pt', /\b(olá|obrigad[oa]|por favor|como está|estou|com você)\b/i],
  ['de', /\b(hallo|danke|bitte|wie geht|ich bin|mit ihnen)\b/i],
];

function detect(text: string): string {
  for (const [lang, pattern] of DETECTION_HINTS) {
    if (pattern.test(text)) return lang;
  }
  return 'en';
}

export const mockProvider: TranslationProvider = {
  name: 'mock',
  async translate({ text, targetLanguage }: TranslateParams): Promise<TranslateResult> {
    const detectedSourceLanguage = detect(text);
    if (detectedSourceLanguage === targetLanguage) {
      return { translatedText: text, detectedSourceLanguage };
    }
    return { translatedText: `[${targetLanguage}] ${text}`, detectedSourceLanguage };
  },
};
