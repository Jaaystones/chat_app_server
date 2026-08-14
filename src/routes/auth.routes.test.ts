import request from 'supertest';
import { createApp } from '../app';
import { resetDb } from '../test-utils/db';

const app = createApp();

function extractCookie(res: request.Response, name: string): string | undefined {
  const raw = res.headers['set-cookie'];
  const cookies: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const match = cookies.find((c) => c.startsWith(`${name}=`));
  return match?.split(';')[0];
}

const validUser = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  username: 'ada_lovelace',
  email: 'ada@example.com',
  password: 'correct-horse-1',
  preferredLanguage: 'en',
  country: 'NG',
};

beforeEach(async () => {
  await resetDb();
});

describe('POST /api/auth/register', () => {
  it('creates a user and returns an access token + refresh cookie', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(validUser.email);
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(extractCookie(res, 'refreshToken')).toBeDefined();
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, username: 'someone_else' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('rejects a duplicate username with 409', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, email: 'someone-else@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USERNAME_TAKEN');
  });

  it('rejects a password that is too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, password: 'short1' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an unsupported/unknown language code', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, preferredLanguage: 'zz' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNSUPPORTED_LANGUAGE');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(validUser);
  });

  it('logs in with email and returns tokens', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(extractCookie(res, 'refreshToken')).toBeDefined();
  });

  it('logs in with username and returns tokens', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: validUser.username, password: validUser.password });

    expect(res.status).toBe(200);
  });

  it('rejects an incorrect password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: validUser.email, password: 'wrong-password-1' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects a nonexistent identifier with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'nobody@example.com', password: 'whatever-1' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('GET /api/auth/me', () => {
  it('rejects a request with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a garbage token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('returns the current user profile for a valid token', async () => {
    const registerRes = await request(app).post('/api/auth/register').send(validUser);
    const { accessToken } = registerRes.body;

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(validUser.email);
  });
});

describe('POST /api/auth/refresh and /api/auth/logout', () => {
  it('issues a new access token and rotates the refresh cookie', async () => {
    const registerRes = await request(app).post('/api/auth/register').send(validUser);
    const refreshCookie = extractCookie(registerRes, 'refreshToken')!;

    const refreshRes = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toEqual(expect.any(String));
    expect(refreshRes.body.accessToken).not.toBe(registerRes.body.accessToken);
    expect(extractCookie(refreshRes, 'refreshToken')).toBeDefined();
    expect(extractCookie(refreshRes, 'refreshToken')).not.toBe(refreshCookie);
  });

  it('rejects reuse of an already-rotated refresh token', async () => {
    const registerRes = await request(app).post('/api/auth/register').send(validUser);
    const refreshCookie = extractCookie(registerRes, 'refreshToken')!;

    await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie);
    const secondUse = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie);

    expect(secondUse.status).toBe(401);
  });

  it('rejects a refresh call with no cookie', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('revokes the refresh token on logout', async () => {
    const registerRes = await request(app).post('/api/auth/register').send(validUser);
    const refreshCookie = extractCookie(registerRes, 'refreshToken')!;

    const logoutRes = await request(app).post('/api/auth/logout').set('Cookie', refreshCookie);
    expect(logoutRes.status).toBe(204);

    const refreshAfterLogout = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie);
    expect(refreshAfterLogout.status).toBe(401);
  });
});
