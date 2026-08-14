import { mockProvider } from './mock.provider';

describe('mockProvider', () => {
  it('detects French from common words and produces a marked translation', async () => {
    const result = await mockProvider.translate({
      text: 'Bonjour, comment allez-vous aujourd’hui?',
      targetLanguage: 'en',
    });
    expect(result.detectedSourceLanguage).toBe('fr');
    expect(result.translatedText).toBe('[en] Bonjour, comment allez-vous aujourd’hui?');
  });

  it('falls back to English when no hint matches', async () => {
    const result = await mockProvider.translate({ text: 'random unrecognized text', targetLanguage: 'fr' });
    expect(result.detectedSourceLanguage).toBe('en');
  });

  it('returns text unchanged when detected language already equals the target', async () => {
    const result = await mockProvider.translate({ text: 'Hola, ¿cómo está usted?', targetLanguage: 'es' });
    expect(result.detectedSourceLanguage).toBe('es');
    expect(result.translatedText).toBe('Hola, ¿cómo está usted?');
  });
});
