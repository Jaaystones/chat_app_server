import { env } from '../../config/env';
import { TranslationProvider } from './types';
import { mockProvider } from './providers/mock.provider';
import { createLibreTranslateProvider } from './providers/libretranslate.provider';
import { createDeepLProvider } from './providers/deepl.provider';
import { createGoogleProvider } from './providers/google.provider';

export function getConfiguredProvider(): TranslationProvider {
  switch (env.TRANSLATION_PROVIDER) {
    case 'libretranslate':
      return createLibreTranslateProvider(env.LIBRETRANSLATE_URL);
    case 'deepl':
      if (!env.DEEPL_API_KEY) {
        throw new Error('TRANSLATION_PROVIDER=deepl requires DEEPL_API_KEY to be set');
      }
      return createDeepLProvider(env.DEEPL_API_KEY);
    case 'google':
      return createGoogleProvider();
    case 'mock':
    default:
      return mockProvider;
  }
}
