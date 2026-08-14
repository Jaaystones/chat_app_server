"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationProviderError = void 0;
class TranslationProviderError extends Error {
    retryable;
    constructor(message, retryable) {
        super(message);
        this.name = 'TranslationProviderError';
        this.retryable = retryable;
    }
}
exports.TranslationProviderError = TranslationProviderError;
//# sourceMappingURL=types.js.map