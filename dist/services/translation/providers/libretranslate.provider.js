"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLibreTranslateProvider = createLibreTranslateProvider;
const types_1 = require("../types");
// Verified against a real self-hosted LibreTranslate instance (docker-compose
// `translate` service). `source: 'auto'` returns the detected source language
// as part of the same response — no separate /detect call needed.
function createLibreTranslateProvider(baseUrl, fetchImpl = fetch) {
    return {
        name: 'libretranslate',
        async translate({ text, targetLanguage }) {
            let response;
            try {
                response = await fetchImpl(`${baseUrl}/translate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ q: text, source: 'auto', target: targetLanguage, format: 'text' }),
                });
            }
            catch (err) {
                throw new types_1.TranslationProviderError(`LibreTranslate request failed: ${err.message}`, true);
            }
            if (response.status === 429 || response.status >= 500) {
                throw new types_1.TranslationProviderError(`LibreTranslate transient error: ${response.status}`, true);
            }
            if (!response.ok) {
                const body = await response.text().catch(() => '');
                throw new types_1.TranslationProviderError(`LibreTranslate request error: ${response.status} ${body}`, false);
            }
            const data = (await response.json());
            if (!data.translatedText) {
                throw new types_1.TranslationProviderError('LibreTranslate returned no translatedText', false);
            }
            return {
                translatedText: data.translatedText,
                detectedSourceLanguage: data.detectedLanguage?.language ?? targetLanguage,
            };
        },
    };
}
//# sourceMappingURL=libretranslate.provider.js.map