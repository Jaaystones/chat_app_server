"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfiguredProvider = getConfiguredProvider;
const env_1 = require("../../config/env");
const mock_provider_1 = require("./providers/mock.provider");
const libretranslate_provider_1 = require("./providers/libretranslate.provider");
const deepl_provider_1 = require("./providers/deepl.provider");
function getConfiguredProvider() {
    switch (env_1.env.TRANSLATION_PROVIDER) {
        case 'libretranslate':
            return (0, libretranslate_provider_1.createLibreTranslateProvider)(env_1.env.LIBRETRANSLATE_URL);
        case 'deepl':
            if (!env_1.env.DEEPL_API_KEY) {
                throw new Error('TRANSLATION_PROVIDER=deepl requires DEEPL_API_KEY to be set');
            }
            return (0, deepl_provider_1.createDeepLProvider)(env_1.env.DEEPL_API_KEY);
        case 'google':
            throw new Error('Google Translate provider is not implemented — set TRANSLATION_PROVIDER=mock, libretranslate, or deepl');
        case 'mock':
        default:
            return mock_provider_1.mockProvider;
    }
}
//# sourceMappingURL=provider.registry.js.map