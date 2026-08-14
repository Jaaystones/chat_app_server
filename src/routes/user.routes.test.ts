import request from 'supertest';
import { createApp } from '../app';
import { resetDb } from '../test-utils/db';
import { createTestUser } from '../test-utils/factories';
import { tokenService } from '../services/auth/token.service';

const app = createApp();

const validUser = {
  firstName: 'Grace',
  lastName: 'Hopper',
  username: 'grace_hopper',
  email: 'grace@example.com',
  password: 'correct-horse-1',
  preferredLanguage: 'en',
};

beforeEach(async () => {
  await resetDb();
});

async function registerAndGetToken() {
  const res = await request(app).post('/api/auth/register').send(validUser);
  return res.body.accessToken as string;
}

describe('PATCH /api/users/me', () => {
  it('rejects requests without a valid token', async () => {
    const res = await request(app).patch('/api/users/me').send({ firstName: 'New' });
    expect(res.status).toBe(401);
  });

  it('updates allowed profile fields', async () => {
    const token = await registerAndGetToken();

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'Grace-Updated', preferredLanguage: 'fr', country: 'FR' });

    expect(res.status).toBe(200);
    expect(res.body.user.firstName).toBe('Grace-Updated');
    expect(res.body.user.preferredLanguageCode).toBe('fr');
    expect(res.body.user.country).toBe('FR');
  });

  it('rejects an unsupported target language', async () => {
    const token = await registerAndGetToken();

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ preferredLanguage: 'zz' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNSUPPORTED_LANGUAGE');
  });

  it('rejects an empty update body', async () => {
    const token = await registerAndGetToken();

    const res = await request(app).patch('/api/users/me').set('Authorization', `Bearer ${token}`).send({});

    expect(res.status).toBe(400);
  });
});

describe('GET /api/users/search', () => {
  it('rejects requests without a valid token', async () => {
    const res = await request(app).get('/api/users/search').query({ q: 'ada' });
    expect(res.status).toBe(401);
  });

  it('rejects a missing query', async () => {
    const token = await registerAndGetToken();
    const res = await request(app).get('/api/users/search').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('finds users by username, name, email, and id substring, excluding the requester', async () => {
    const self = await createTestUser({ username: 'searcher' });
    const token = tokenService.signAccessToken(self.id);

    const byUsername = await createTestUser({ username: 'ada_lovelace', email: 'ada@x.com' });
    const byEmail = await createTestUser({ username: 'other1', email: 'findme@x.com' });
    const byName = await createTestUser({ username: 'other2', firstName: 'Findable' });
    await createTestUser({ username: 'unrelated', firstName: 'Nobody', email: 'nobody@x.com' });

    const usernameRes = await request(app)
      .get('/api/users/search')
      .query({ q: 'ada_love' })
      .set('Authorization', `Bearer ${token}`);
    expect(usernameRes.body.users.map((u: { id: string }) => u.id)).toEqual([byUsername.id]);

    const emailRes = await request(app)
      .get('/api/users/search')
      .query({ q: 'findme' })
      .set('Authorization', `Bearer ${token}`);
    expect(emailRes.body.users.map((u: { id: string }) => u.id)).toEqual([byEmail.id]);

    const nameRes = await request(app)
      .get('/api/users/search')
      .query({ q: 'Findable' })
      .set('Authorization', `Bearer ${token}`);
    expect(nameRes.body.users.map((u: { id: string }) => u.id)).toEqual([byName.id]);

    const idRes = await request(app)
      .get('/api/users/search')
      .query({ q: byUsername.id })
      .set('Authorization', `Bearer ${token}`);
    expect(idRes.body.users.map((u: { id: string }) => u.id)).toEqual([byUsername.id]);

    const selfIdRes = await request(app)
      .get('/api/users/search')
      .query({ q: self.id })
      .set('Authorization', `Bearer ${token}`);
    expect(selfIdRes.body.users).toEqual([]);

    const noneRes = await request(app)
      .get('/api/users/search')
      .query({ q: 'zzz-nomatch' })
      .set('Authorization', `Bearer ${token}`);
    expect(noneRes.body.users).toEqual([]);
  });

  it('never returns passwordHash', async () => {
    const self = await createTestUser({ username: 'searcher2' });
    const token = tokenService.signAccessToken(self.id);
    await createTestUser({ username: 'visible_user' });

    const res = await request(app)
      .get('/api/users/search')
      .query({ q: 'visible' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.users[0]).not.toHaveProperty('passwordHash');
  });
});

describe('GET /api/users/:id', () => {
  it('rejects requests without a valid token', async () => {
    const res = await request(app).get('/api/users/does-not-matter');
    expect(res.status).toBe(401);
  });

  it('returns 404 for a nonexistent user', async () => {
    const token = await registerAndGetToken();
    const res = await request(app)
      .get('/api/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('returns the public profile for an existing user', async () => {
    const token = await registerAndGetToken();
    const other = await createTestUser({ username: 'viewable' });

    const res = await request(app).get(`/api/users/${other.id}`).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(other.id);
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });
});
