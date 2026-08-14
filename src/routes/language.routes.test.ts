import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

describe('GET /api/languages', () => {
  it('returns the active languages without requiring auth', async () => {
    const res = await request(app).get('/api/languages');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.languages)).toBe(true);
    expect(res.body.languages.length).toBeGreaterThan(0);
    expect(res.body.languages[0]).toHaveProperty('code');
    expect(res.body.languages[0]).toHaveProperty('translationSupported');
  });
});
