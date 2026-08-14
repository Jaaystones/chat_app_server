import { createDeepLProvider } from './deepl.provider';
import { TranslationProviderError } from '../types';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('DeepLProvider (unit — mocked fetch, NOT verified against the live API)', () => {
  it('translates and maps the response, lowercasing the detected language', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse(200, {
        translations: [{ text: 'Bonjour le monde', detected_source_language: 'EN' }],
      }),
    );
    const provider = createDeepLProvider('fake-key:fx', fetchMock as unknown as typeof fetch);

    const result = await provider.translate({ text: 'Hello world', targetLanguage: 'fr' });

    expect(result).toEqual({ translatedText: 'Bonjour le monde', detectedSourceLanguage: 'en' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api-free.deepl.com/v2/translate',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('uses the paid endpoint for keys without the :fx suffix', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(jsonResponse(200, { translations: [{ text: 'x', detected_source_language: 'EN' }] }));
    const provider = createDeepLProvider('real-paid-key', fetchMock as unknown as typeof fetch);

    await provider.translate({ text: 'hi', targetLanguage: 'fr' });

    expect(fetchMock).toHaveBeenCalledWith('https://api.deepl.com/v2/translate', expect.anything());
  });

  it('throws a retryable error on 429', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(429, {}));
    const provider = createDeepLProvider('key:fx', fetchMock as unknown as typeof fetch);

    await expect(provider.translate({ text: 'hi', targetLanguage: 'fr' })).rejects.toMatchObject({
      retryable: true,
    });
  });

  it('throws a retryable error on 5xx', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(503, {}));
    const provider = createDeepLProvider('key:fx', fetchMock as unknown as typeof fetch);

    await expect(provider.translate({ text: 'hi', targetLanguage: 'fr' })).rejects.toMatchObject({
      retryable: true,
    });
  });

  it('throws a non-retryable error on 4xx (excluding 429)', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(400, { message: 'bad request' }));
    const provider = createDeepLProvider('key:fx', fetchMock as unknown as typeof fetch);

    await expect(provider.translate({ text: 'hi', targetLanguage: 'fr' })).rejects.toMatchObject({
      retryable: false,
    });
  });

  it('throws a retryable error when the network request itself fails', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const provider = createDeepLProvider('key:fx', fetchMock as unknown as typeof fetch);

    await expect(provider.translate({ text: 'hi', targetLanguage: 'fr' })).rejects.toMatchObject({
      retryable: true,
    });
  });

  it('throws a non-retryable error when the response has no translations', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { translations: [] }));
    const provider = createDeepLProvider('key:fx', fetchMock as unknown as typeof fetch);

    await expect(provider.translate({ text: 'hi', targetLanguage: 'fr' })).rejects.toMatchObject({
      retryable: false,
    });
  });

  it('rejects an unmapped target language before making a request', async () => {
    const fetchMock = jest.fn();
    const provider = createDeepLProvider('key:fx', fetchMock as unknown as typeof fetch);

    await expect(provider.translate({ text: 'hi', targetLanguage: 'yo' })).rejects.toBeInstanceOf(
      TranslationProviderError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
