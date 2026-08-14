"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRetry = withRetry;
const types_1 = require("./types");
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
// Bounded exponential backoff. Only retries errors the provider marked
// retryable (network failures, 429s, 5xx) — a 400 for an unsupported
// language pair, for instance, will never succeed on retry.
async function withRetry(fn, options) {
    let lastError;
    for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
        try {
            // eslint-disable-next-line no-await-in-loop
            return await fn();
        }
        catch (err) {
            lastError = err;
            const retryable = err instanceof types_1.TranslationProviderError ? err.retryable : true;
            if (!retryable || attempt === options.attempts)
                throw err;
            // eslint-disable-next-line no-await-in-loop
            await sleep(options.baseDelayMs * 2 ** (attempt - 1));
        }
    }
    throw lastError;
}
//# sourceMappingURL=retry.js.map