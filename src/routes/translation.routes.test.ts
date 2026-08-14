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

async function createConversationAndMessage(tokenA: string, userBId: string, content: string) {
  const convoRes = await request(app)
    .post('/api/conversations')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ participantId: userBId });
  const conversationId = convoRes.body.conversation.id as string;

  const msgRes = await request(app)
    .post(`/api/conversations/${conversationId}/messages`)
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ content });
  return msgRes.body.message.id as string;
}

describe('POST /api/messages/:id/translate', () => {
  it('rejects requests without a valid token', async () => {
    const res = await request(app).post('/api/messages/whatever/translate').send({ targetLanguage: 'fr' });
    expect(res.status).toBe(401);
  });

  it('rejects an invalid body', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .post('/api/messages/whatever/translate')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 when the message does not exist', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .post('/api/messages/00000000-0000-0000-0000-000000000000/translate')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetLanguage: 'fr' });
    expect(res.status).toBe(404);
  });

  it('returns 404 when the caller is not a participant of the message’s conversation', async () => {
    const { token: aliceToken } = await authedUser({ username: 'alice_t1' });
    const { user: bob } = await authedUser({ username: 'bob_t1' });
    const { token: outsiderToken } = await authedUser({ username: 'outsider_t1' });

    const messageId = await createConversationAndMessage(aliceToken, bob.id, 'Hello Bob');

    const res = await request(app)
      .post(`/api/messages/${messageId}/translate`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ targetLanguage: 'fr' });

    expect(res.status).toBe(404);
  });

  it('translates a message using the configured (mock, in tests) provider', async () => {
    const { token: aliceToken } = await authedUser({ username: 'alice_t2' });
    const { user: bob } = await authedUser({ username: 'bob_t2' });

    const messageId = await createConversationAndMessage(aliceToken, bob.id, 'Hello Bob');

    const res = await request(app)
      .post(`/api/messages/${messageId}/translate`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ targetLanguage: 'fr' });

    expect(res.status).toBe(200);
    expect(res.body.translation.status).toBe('COMPLETED');
    expect(res.body.translation.targetLanguage).toBe('fr');
    expect(res.body.translation.translatedContent).toEqual(expect.any(String));
  });

  it('returns a 200 with a FAILED status for an unsupported target language (never breaks the request)', async () => {
    const { token: aliceToken } = await authedUser({ username: 'alice_t3' });
    const { user: bob } = await authedUser({ username: 'bob_t3' });

    const messageId = await createConversationAndMessage(aliceToken, bob.id, 'Hello Bob');

    const res = await request(app)
      .post(`/api/messages/${messageId}/translate`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ targetLanguage: 'yo' });

    expect(res.status).toBe(200);
    expect(res.body.translation.status).toBe('FAILED');
    expect(res.body.translation.errorMessage).toBe('UNSUPPORTED_LANGUAGE');
  });
});
