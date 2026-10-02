import express from 'express';
import request from 'supertest';
import { createNextlinkProxy } from './proxy';

function app(authenticated = true) {
  const server = express();
  server.use(express.json());
  server.use((req, _res, next) => {
    if (authenticated) Object.assign(req, { user: { id: 'signed-in-user' } });
    next();
  });
  server.use(
    '/api/nextlink',
    createNextlinkProxy({ baseURL: 'http://fixture.test', apiKey: 'server-only-key' }),
  );
  return server;
}
it('takes identity from the authenticated user and keeps the integration key server-side', async () => {
  const fetcher = jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(Response.json({ selected: [] }));
  await request(app())
    .get('/api/nextlink/chat-a')
    .set('X-Nextlink-User', 'forged-user')
    .expect(200, { selected: [] });
  expect(fetcher).toHaveBeenCalledWith(
    'http://fixture.test/ui/chat-a',
    expect.objectContaining({
      headers: expect.objectContaining({
        'X-Nextlink-User': 'signed-in-user',
        Authorization: 'Bearer server-only-key',
      }),
    }),
  );
});
it('rejects unsigned users and unsupported paths before calling the bridge', async () => {
  const fetcher = jest.spyOn(globalThis, 'fetch');
  await request(app(false)).get('/api/nextlink/chat-a').expect(401);
  await request(app()).get('/api/nextlink/chat-a/unknown').expect(404);
  expect(fetcher).not.toHaveBeenCalled();
});
it('sanitizes network failures and preserves unsuccessful bridge status', async () => {
  jest.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('secret provider payload'));
  const failure = await request(app()).get('/api/nextlink/chat-a').expect(502);
  expect(JSON.stringify(failure.body)).not.toContain('secret');
  jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(
      Response.json({ error: { message: 'Expired approval' } }, { status: 404 }),
    );
  await request(app())
    .post('/api/nextlink/chat-a/approval')
    .send({ id: 'expired', allow: true })
    .expect(404);
});
