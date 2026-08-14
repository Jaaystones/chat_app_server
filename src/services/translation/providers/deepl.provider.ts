import { TranslationProvider, TranslateParams, TranslateResult, TranslationProviderError } from '../types';

// Built against DeepL's documented API v2 contract and unit-tested against a
// mocked fetch — NOT verified against the live DeepL API (no key available
// in this environment). Verify manually before relying on it in production.
const LANGUAGE_CODE_MAP: Record<string, string> = {
  en: 'EN',
  fr: 'FR',
  es: 'ES',
  pt: 'PT-BR',
  de: 'DE',
  ar: 'AR',
};

function toDeepLTargetCode(code: string): string {
  const mapped = LANGUAGE_CODE_MAP[code];
  if (!mapped) {
    throw new TranslationProviderError(`No DeepL language mapping for "${code}"`, false);
  }
  return mapped;
}

export function createDeepLProvider(apiKey: string, fetchImpl: typeof fetch = fetch): TranslationProvider {
  // DeepL free-tier keys are suffixed ":fx" and must use the api-free host.
  const endpoint = apiKey.endsWith(':fx')
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate';

  return {
    name: 'deepl',

    async translate({ text, targetLanguage }: TranslateParams): Promise<TranslateResult> {
      const targetCode = toDeepLTargetCode(targetLanguage);

      let response: Response;
      try {
        response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `DeepL-Auth-Key ${apiKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ text, target_lang: targetCode }),
        });
      } catch (err) {
        throw new TranslationProviderError(`DeepL request failed: ${(err as Error).message}`, true);
      }

      if (response.status === 429 || response.status >= 500) {
        throw new TranslationProviderError(`DeepL transient error: ${response.status}`, true);
      }
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new TranslationProviderError(`DeepL request error: ${response.status} ${body}`, false);
      }

      const data = (await response.json()) as {
        translations?: { text: string; detected_source_language: string }[];
      };
      const translation = data.translations?.[0];
      if (!translation) {
        throw new TranslationProviderError('DeepL returned no translation', false);
      }

      return {
        translatedText: translation.text,
        detectedSourceLanguage: translation.detected_source_language.toLowerCase(),
      };
    },
  };
}
