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

async function createConversation(tokenA: string, userBId: string) {
  const res = await request(app)
    .post('/api/conversations')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ participantId: userBId });
  return res.body.conversation.id as string;
}

describe('POST /api/conversations/:id/messages', () => {
  it('rejects requests without a valid token', async () => {
    const res = await request(app).post('/api/conversations/whatever/messages').send({ content: 'hi' });
    expect(res.status).toBe(401);
  });

  it('rejects empty content', async () => {
    const { token: aliceToken } = await authedUser({ username: 'alice_m1' });
    const { user: bob } = await authedUser({ username: 'bob_m1' });
    const conversationId = await createConversation(aliceToken, bob.id);

    const res = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: '   ' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when the caller is not a participant', async () => {
    const { token: aliceToken } = await authedUser({ username: 'alice_m2' });
    const { user: bob } = await authedUser({ username: 'bob_m2' });
    const { token: outsiderToken } = await authedUser({ username: 'outsider_m2' });
    const conversationId = await createConversation(aliceToken, bob.id);

    const res = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ content: 'sneaky' });

    expect(res.status).toBe(404);
  });

  it('creates a message with SENT status and no translation yet', async () => {
    const { token: aliceToken } = await authedUser({ username: 'alice_m3' });
    const { user: bob } = await authedUser({ username: 'bob_m3' });
    const conversationId = await createConversation(aliceToken, bob.id);

    const res = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'Hello Bob' });

    expect(res.status).toBe(201);
    expect(res.body.message.originalContent).toBe('Hello Bob');
    expect(res.body.message.status).toBe('SENT');
    expect(res.body.message.detectedLanguage).toBeNull();
    expect(res.body.message.conversationId).toBe(conversationId);
  });
});

describe('GET /api/conversations/:id/messages', () => {
  it('rejects requests without a valid token', async () => {
    const res = await request(app).get('/api/conversations/whatever/messages');
    expect(res.status).toBe(401);
  });

  it('returns 404 when the caller is not a participant', async () => {
    const { token: aliceToken } = await authedUser({ username: 'alice_m4' });
    const { user: bob } = await authedUser({ username: 'bob_m4' });
    const { token: outsiderToken } = await authedUser({ username: 'outsider_m4' });
    const conversationId = await createConversation(aliceToken, bob.id);

    const res = await request(app)
      .get(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(res.status).toBe(404);
  });

  it('returns messages newest-first', async () => {
    const { token: aliceToken } = await authedUser({ username: 'alice_m5' });
    const { user: bob } = await authedUser({ username: 'bob_m5' });
    const conversationId = await createConversation(aliceToken, bob.id);

    await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'first' });
    await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'second' });

    const res = await request(app)
      .get(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(2);
    expect(res.body.messages[0].originalContent).toBe('second');
    expect(res.body.messages[1].originalContent).toBe('first');
    expect(res.body.nextCursor).toBeNull();
  });

  it('paginates with a cursor, covering every message exactly once', async () => {
    const { token: aliceToken } = await authedUser({ username: 'alice_m6' });
    const { user: bob } = await authedUser({ username: 'bob_m6' });
    const conversationId = await createConversation(aliceToken, bob.id);

    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ content: `message-${i}` });
    }

    const seen: string[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 10; page += 1) {
      const query = cursor ? { before: cursor, limit: 2 } : { limit: 2 };
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .query(query)
        .set('Authorization', `Bearer ${aliceToken}`);

      seen.push(...res.body.messages.map((m: { originalContent: string }) => m.originalContent));
      cursor = res.body.nextCursor;
      if (!cursor) break;
    }

    expect(seen).toEqual(['message-4', 'message-3', 'message-2', 'message-1', 'message-0']);
  });
});

describe('PATCH /api/messages/:id', () => {
  it('rejects requests without a valid token', async () => {
    const res = await request(app).patch('/api/messages/whatever').send({ content: 'x' });
    expect(res.status).toBe(401);
  });

  it('rejects editing a message you do not own', async () => {
    const { token: aliceToken } = await authedUser({ username: 'alice_m7' });
    const { user: bob, token: bobToken } = await authedUser({ username: 'bob_m7' });
    const conversationId = await createConversation(aliceToken, bob.id);

    const created = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'original' });

    const res = await request(app)
      .patch(`/api/messages/${created.body.message.id}`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ content: 'hijacked' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_MESSAGE_OWNER');
  });

  it('updates content and sets editedAt', async () => {
    const { token: aliceToken } = await authedUser({ username: 'alice_m8' });
    const { user: bob } = await authedUser({ username: 'bob_m8' });
    const conversationId = await createConversation(aliceToken, bob.id);

    const created = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'original' });

    const res = await request(app)
      .patch(`/api/messages/${created.body.message.id}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'edited' });

    expect(res.status).toBe(200);
    expect(res.body.message.originalContent).toBe('edited');
    expect(res.body.message.editedAt).not.toBeNull();
  });
});

describe('DELETE /api/messages/:id', () => {
  it('rejects requests without a valid token', async () => {
    const res = await request(app).delete('/api/messages/whatever');
    expect(res.status).toBe(401);
  });

  it('rejects deleting a message you do not own', async () => {
    const { token: aliceToken } = await authedUser({ username: 'alice_m9' });
    const { user: bob, token: bobToken } = await authedUser({ username: 'bob_m9' });
    const conversationId = await createConversation(aliceToken, bob.id);

    const created = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'original' });

    const res = await request(app)
      .delete(`/api/messages/${created.body.message.id}`)
      .set('Authorization', `Bearer ${bobToken}`);

    expect(res.status).toBe(403);
  });

  it('soft-deletes: content is redacted but the row remains in history', async () => {
    const { token: aliceToken } = await authedUser({ username: 'alice_m10' });
    const { user: bob } = await authedUser({ username: 'bob_m10' });
    const conversationId = await createConversation(aliceToken, bob.id);

    const created = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'to be deleted' });

    const deleteRes = await request(app)
      .delete(`/api/messages/${created.body.message.id}`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(deleteRes.status).toBe(204);

    const listRes = await request(app)
      .get(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(listRes.body.messages).toHaveLength(1);
    expect(listRes.body.messages[0].originalContent).toBeNull();
    expect(listRes.body.messages[0].deletedAt).not.toBeNull();
  });

  it('rejects editing an already-deleted message', async () => {
    const { token: aliceToken } = await authedUser({ username: 'alice_m11' });
    const { user: bob } = await authedUser({ username: 'bob_m11' });
    const conversationId = await createConversation(aliceToken, bob.id);

    const created = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'to be deleted' });

    await request(app)
      .delete(`/api/messages/${created.body.message.id}`)
      .set('Authorization', `Bearer ${aliceToken}`);

    const res = await request(app)
      .patch(`/api/messages/${created.body.message.id}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'resurrected' });

    expect(res.status).toBe(404);
  });
});

describe('GET /api/conversations/:id/messages — translation enrichment', () => {
  it('returns translation: null when no translation exists for the caller (e.g. same preferred language)', async () => {
    const { token: aliceToken } = await authedUser({ username: 'alice_te1', preferredLanguage: 'en' });
    const { user: bob } = await authedUser({ username: 'bob_te1', preferredLanguage: 'en' });
    const conversationId = await createConversation(aliceToken, bob.id);

    await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'Hello Bob' });

    const res = await request(app)
      .get(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(res.body.messages[0].translation).toBeNull();
  });

  it("includes the recipient's own completed translation once auto-translation finishes", async () => {
    const { token: aliceToken } = await authedUser({ username: 'alice_te2', preferredLanguage: 'en' });
    const { user: bob, token: bobToken } = await authedUser({ username: 'bob_te2', preferredLanguage: 'fr' });
    const conversationId = await createConversation(aliceToken, bob.id);

    await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'Hello Bob' });

    // Auto-translation runs fire-and-forget after send; poll briefly for it to land
    // rather than asserting on a fixed delay.
    let translation;
    for (let i = 0; i < 20; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${bobToken}`);
      translation = res.body.messages[0].translation;
      if (translation) break;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    expect(translation).not.toBeNull();
    expect(translation.status).toBe('COMPLETED');
    expect(translation.targetLanguage).toBe('fr');
    expect(translation.translatedContent).toBe('[fr] Hello Bob');
  });

  it("does not include the sender's own message translated into the recipient's language", async () => {
    // The sender's own copy of their own message should show no translation —
    // they wrote it in their own preferred language.
    const { token: aliceToken } = await authedUser({ username: 'alice_te3', preferredLanguage: 'en' });
    const { user: bob } = await authedUser({ username: 'bob_te3', preferredLanguage: 'fr' });
    const conversationId = await createConversation(aliceToken, bob.id);

    await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'Hello Bob' });

    const res = await request(app)
      .get(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(res.body.messages[0].translation).toBeNull();
  });
});
