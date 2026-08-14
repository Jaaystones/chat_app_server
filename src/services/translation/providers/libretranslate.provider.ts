import { TranslationProvider, TranslateParams, TranslateResult, TranslationProviderError } from '../types';

// Below this, LibreTranslate's own detection is treated as unreliable rather
// than trusted. Empirically verified against the real service: clearly-
// attributable text ("Bonjour", "Hello, Balogun") scores ~90-100%; short or
// ambiguous phrases ("Comment tu va?", "Ho Balogun") scored 45% and 22%.
const DETECTION_CONFIDENCE_THRESHOLD = 60;

interface LibreTranslateResponse {
  translatedText?: string;
  detectedLanguage?: { language: string; confidence: number };
}

async function requestTranslation(
  baseUrl: string,
  fetchImpl: typeof fetch,
  text: string,
  targetLanguage: string,
  source: string,
): Promise<LibreTranslateResponse> {
  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source, target: targetLanguage, format: 'text' }),
    });
  } catch (err) {
    throw new TranslationProviderError(`LibreTranslate request failed: ${(err as Error).message}`, true);
  }

  if (response.status === 429 || response.status >= 500) {
    throw new TranslationProviderError(`LibreTranslate transient error: ${response.status}`, true);
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new TranslationProviderError(`LibreTranslate request error: ${response.status} ${body}`, false);
  }

  return (await response.json()) as LibreTranslateResponse;
}

// Verified against a real self-hosted LibreTranslate instance (docker-compose
// `translate` service). `source: 'auto'` returns the detected source language
// as part of the same response — no separate /detect call needed for the
// common (confident) case.
export function createLibreTranslateProvider(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): TranslationProvider {
  return {
    name: 'libretranslate',

    async translate({ text, targetLanguage, sourceLanguageHint }: TranslateParams): Promise<TranslateResult> {
      const auto = await requestTranslation(baseUrl, fetchImpl, text, targetLanguage, 'auto');

      const confidence = auto.detectedLanguage?.confidence ?? 100;
      const detected = auto.detectedLanguage?.language;
      const lowConfidence = confidence < DETECTION_CONFIDENCE_THRESHOLD;

      if (lowConfidence && sourceLanguageHint && sourceLanguageHint !== detected) {
        // Detection wasn't confident — the sender's own stated preferred
        // language is a better prior than a low-confidence guess. Still not
        // an unconditional override: if detection was confident, or there's
        // no hint to fall back to, the auto result stands.
        const hinted = await requestTranslation(baseUrl, fetchImpl, text, targetLanguage, sourceLanguageHint);
        if (!hinted.translatedText) {
          throw new TranslationProviderError('LibreTranslate returned no translatedText', false);
        }
        return { translatedText: hinted.translatedText, detectedSourceLanguage: sourceLanguageHint };
      }

      if (!auto.translatedText) {
        throw new TranslationProviderError('LibreTranslate returned no translatedText', false);
      }
      return {
        translatedText: auto.translatedText,
        detectedSourceLanguage: detected ?? targetLanguage,
      };
    },
  };
}
