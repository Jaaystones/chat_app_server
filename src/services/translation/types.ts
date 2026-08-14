export interface TranslateParams {
  text: string;
  targetLanguage: string; // our internal language code, e.g. "fr"
  // The sender's own stated preferred language, if known. Providers that can
  // gauge their own detection confidence (LibreTranslate) use this as a
  // fallback when auto-detection is unreliable — verified empirically that
  // short/ambiguous phrases ("Comment tu va?") score ~20-45% confidence vs
  // ~90-100% for clearly-attributable text. Not a hard override: detection
  // is still tried first, since Section 16 explicitly warns against always
  // assuming preferred language reflects the actual message content.
  sourceLanguageHint?: string;
}

export interface TranslateResult {
  translatedText: string;
  detectedSourceLanguage: string;
}

export interface TranslationProvider {
  readonly name: string;
  translate(params: TranslateParams): Promise<TranslateResult>;
}

export class TranslationProviderError extends Error {
  public readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = 'TranslationProviderError';
    this.retryable = retryable;
  }
}
