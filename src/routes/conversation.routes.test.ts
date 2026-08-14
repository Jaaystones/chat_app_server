import request from 'supertest';
import { createApp } from '../app';
import { resetDb } from '../test-utils/db';
import { createTestUser } from '../test-utils/factories';
import { tokenService } from '../services/auth/token.service';

const app = createApp();

beforeEach(async () => {
  await resetDb();
});

async function authedUser(overrides?: Parameters<typeof createTestUser>[0]) {
  const user = await createTestUser(overrides);
  const token = tokenService.signAccessToken(user.id);
  return { user, token };
}

describe('POST /api/conversations', () => {
  it('rejects requests without a valid token', async () => {
    const res = await request(app).post('/api/conversations').send({ participantId: 'whatever' });
    expect(res.status).toBe(401);
  });

  it('rejects a missing participantId', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('rejects starting a conversation with yourself', async () => {
    const { user, token } = await authedUser();
    const res = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ participantId: user.id });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PARTICIPANT');
  });

  it('returns 404 for a nonexistent participant', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ participantId: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(404);
  });

  it('creates a DIRECT conversation between the two users', async () => {
    const { token } = await authedUser({ username: 'alice', preferredLanguage: 'en' });
    const { user: bob } = await authedUser({ username: 'bob', preferredLanguage: 'fr' });

    const res = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ participantId: bob.id });

    expect(res.status).toBe(201);
    expect(res.body.conversation.type).toBe('DIRECT');
    expect(res.body.conversation.otherParticipant.id).toBe(bob.id);
    expect(res.body.conversation.otherParticipant.preferredLanguageCode).toBe('fr');
    expect(res.body.conversation.participants).toHaveLength(2);
  });

  it('is idempotent: a second request between the same pair returns the existing conversation', async () => {
    const { token } = await authedUser({ username: 'alice2' });
    const { user: bob } = await authedUser({ username: 'bob2' });

    const first = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ participantId: bob.id });
    const second = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ participantId: bob.id });

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.conversation.id).toBe(first.body.conversation.id);
  });

  it('is symmetric: reversing initiator/target still finds the existing conversation', async () => {
    const { user: alice, token: aliceToken } = await authedUser({ username: 'alice3' });
    const { user: bob, token: bobToken } = await authedUser({ username: 'bob3' });

    const created = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ participantId: bob.id });

    const reciprocal = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ participantId: alice.id });

    expect(reciprocal.status).toBe(200);
    expect(reciprocal.body.conversation.id).toBe(created.body.conversation.id);
  });
});

describe('GET /api/conversations', () => {
  it('rejects requests without a valid token', async () => {
    const res = await request(app).get('/api/conversations');
    expect(res.status).toBe(401);
  });

  it("only returns the requesting user's conversations", async () => {
    const { token: aliceToken } = await authedUser({ username: 'alice4' });
    const { token: bobToken, user: bob } = await authedUser({ username: 'bob4' });
    const { user: carol } = await authedUser({ username: 'carol4' });

    await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ participantId: bob.id });
    await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ participantId: carol.id });

    const aliceList = await request(app).get('/api/conversations').set('Authorization', `Bearer ${aliceToken}`);
    expect(aliceList.body.conversations).toHaveLength(1);
    expect(aliceList.body.conversations[0].otherParticipant.id).toBe(bob.id);

    const bobList = await request(app).get('/api/conversations').set('Authorization', `Bearer ${bobToken}`);
    expect(bobList.body.conversations).toHaveLength(2);
  });
});

describe('GET /api/conversations/:id', () => {
  it('rejects requests without a valid token', async () => {
    const res = await request(app).get('/api/conversations/does-not-matter');
    expect(res.status).toBe(401);
  });

  it('returns 404 for a nonexistent conversation', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .get('/api/conversations/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 (not 403) for a conversation the user is not part of', async () => {
    const { token: aliceToken } = await authedUser({ username: 'alice5' });
    const { user: bob } = await authedUser({ username: 'bob5' });
    const { token: outsiderToken } = await authedUser({ username: 'outsider5' });

    const created = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ participantId: bob.id });

    const res = await request(app)
      .get(`/api/conversations/${created.body.conversation.id}`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(res.status).toBe(404);
  });

  it('returns the conversation detail for a participant', async () => {
    const { token: aliceToken } = await authedUser({ username: 'alice6' });
    const { user: bob } = await authedUser({ username: 'bob6' });

    const created = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ participantId: bob.id });

    const res = await request(app)
      .get(`/api/conversations/${created.body.conversation.id}`)
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(res.status).toBe(200);
    expect(res.body.conversation.id).toBe(created.body.conversation.id);
  });
});
