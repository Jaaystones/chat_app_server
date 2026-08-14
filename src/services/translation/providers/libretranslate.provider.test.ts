import { createLibreTranslateProvider } from './libretranslate.provider';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('LibreTranslateProvider (unit — mocked fetch)', () => {
  it('translates and reads detectedLanguage from the same response', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse(200, {
        translatedText: 'Hello, how are you today?',
        detectedLanguage: { language: 'fr', confidence: 100 },
      }),
    );
    const provider = createLibreTranslateProvider('http://translate:5000', fetchMock as unknown as typeof fetch);

    const result = await provider.translate({
      text: 'Bonjour, comment allez-vous aujourd’hui ?',
      targetLanguage: 'en',
    });

    expect(result).toEqual({ translatedText: 'Hello, how are you today?', detectedSourceLanguage: 'fr' });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://translate:5000/translate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          q: 'Bonjour, comment allez-vous aujourd’hui ?',
          source: 'auto',
          target: 'en',
          format: 'text',
        }),
      }),
    );
  });

  it('throws a retryable error on 5xx', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(500, { error: 'internal' }));
    const provider = createLibreTranslateProvider('http://translate:5000', fetchMock as unknown as typeof fetch);

    await expect(provider.translate({ text: 'hi', targetLanguage: 'fr' })).rejects.toMatchObject({
      retryable: true,
    });
  });

  it('throws a non-retryable error on 400 (e.g. unsupported language)', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(400, { error: 'yo is not supported' }));
    const provider = createLibreTranslateProvider('http://translate:5000', fetchMock as unknown as typeof fetch);

    await expect(provider.translate({ text: 'hi', targetLanguage: 'yo' })).rejects.toMatchObject({
      retryable: false,
    });
  });

  it('throws a retryable error when the network request itself fails', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const provider = createLibreTranslateProvider('http://translate:5000', fetchMock as unknown as typeof fetch);

    await expect(provider.translate({ text: 'hi', targetLanguage: 'fr' })).rejects.toMatchObject({
      retryable: true,
    });
  });

  it('throws a non-retryable error when translatedText is missing', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, {}));
    const provider = createLibreTranslateProvider('http://translate:5000', fetchMock as unknown as typeof fetch);

    await expect(provider.translate({ text: 'hi', targetLanguage: 'fr' })).rejects.toMatchObject({
      retryable: false,
    });
  });

  describe('low-confidence detection fallback', () => {
    it('re-requests with the source hint when confidence is low and the hint differs from the detected language', async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce(
          jsonResponse(200, {
            translatedText: 'Comment tu va?', // no-op: (wrongly) thought source==target
            detectedLanguage: { language: 'en', confidence: 45 },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse(200, { translatedText: 'How are you?', detectedLanguage: { language: 'fr', confidence: 90 } }),
        );
      const provider = createLibreTranslateProvider('http://translate:5000', fetchMock as unknown as typeof fetch);

      const result = await provider.translate({
        text: 'Comment tu va?',
        targetLanguage: 'en',
        sourceLanguageHint: 'fr',
      });

      expect(result).toEqual({ translatedText: 'How are you?', detectedSourceLanguage: 'fr' });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        'http://translate:5000/translate',
        expect.objectContaining({
          body: JSON.stringify({ q: 'Comment tu va?', source: 'fr', target: 'en', format: 'text' }),
        }),
      );
    });

    it('does not re-request when confidence is high, even if a hint is provided', async () => {
      const fetchMock = jest.fn().mockResolvedValue(
        jsonResponse(200, { translatedText: 'Hello', detectedLanguage: { language: 'fr', confidence: 95 } }),
      );
      const provider = createLibreTranslateProvider('http://translate:5000', fetchMock as unknown as typeof fetch);

      const result = await provider.translate({ text: 'Bonjour', targetLanguage: 'en', sourceLanguageHint: 'es' });

      expect(result.detectedSourceLanguage).toBe('fr');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not re-request when confidence is low but no hint was provided', async () => {
      const fetchMock = jest.fn().mockResolvedValue(
        jsonResponse(200, { translatedText: 'Ho Balogun', detectedLanguage: { language: 'en', confidence: 22 } }),
      );
      const provider = createLibreTranslateProvider('http://translate:5000', fetchMock as unknown as typeof fetch);

      const result = await provider.translate({ text: 'Ho Balogun', targetLanguage: 'fr' });

      expect(result.detectedSourceLanguage).toBe('en');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not re-request when the hint matches what was already detected', async () => {
      const fetchMock = jest.fn().mockResolvedValue(
        jsonResponse(200, { translatedText: 'x', detectedLanguage: { language: 'fr', confidence: 30 } }),
      );
      const provider = createLibreTranslateProvider('http://translate:5000', fetchMock as unknown as typeof fetch);

      await provider.translate({ text: 'x', targetLanguage: 'en', sourceLanguageHint: 'fr' });

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
