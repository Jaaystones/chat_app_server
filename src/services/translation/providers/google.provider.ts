import translate from 'google-translate-api-x';
import { TranslationProvider, TranslateParams, TranslateResult, TranslationProviderError } from '../types';
import { logger } from '../../../config/logger';

export function createGoogleProvider(): TranslationProvider {
  return {
    name: 'google',
    translate: async (params: TranslateParams): Promise<TranslateResult> => {
      try {
        const res = await translate(params.text, {
          to: params.targetLanguage,
          // google-translate-api-x auto-detects by default if from is not specified
          // and returns the detected language in res.from.language.iso
        });

        // The API returns the ISO code for the detected language
        let detected = res.from.language.iso;
        
        // Ensure we always return a valid string, even if detection fails
        if (!detected) {
          detected = 'en'; // fallback
        }

        return {
          translatedText: res.text,
          detectedSourceLanguage: detected,
        };
      } catch (error: any) {
        logger.error('Google Translate (Free API) error:', error.message);
        
        // Rate limits usually return 429
        const isRateLimited = error.message?.includes('429') || error.message?.includes('TooManyRequests');
        
        throw new TranslationProviderError(
          `Google Translate failed: ${error.message}`,
          isRateLimited || error.message?.includes('timeout')
        );
      }
    },
  };
}
