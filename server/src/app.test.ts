import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

// Point the Anthropic SDK at a closed port so coach calls fail fast without a real key.
process.env.ANTHROPIC_API_KEY = 'test-key';
process.env.ANTHROPIC_BASE_URL = 'http://127.0.0.1:9';

const { createApp } = await import('./app.js');
const { MemoryUserStore, issueToken, readToken } = await import('./accounts.js');
const { hasPlus, clearEntitlementCache } = await import('./entitlements.js');

let server: Server;
let base: string;
before(async () => {
  const app = createApp({
    users: new MemoryUserStore(),
    sessionSecret: 'test-secret-at-least-16-chars',
    coachEnabled: true,
    plusCheck: async (id) => id === 'rc-plus-user-123',
  });
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

test('sign up, sign in, me, delete account', async () => {
  let res = await post('/auth/signup', { email: ' Sam@Example.com ', password: 'short', name: 'Sam' });
  assert.equal(res.status, 400, 'weak password rejected');

  res = await post('/auth/signup', { email: 'Sam@Example.com', password: 'correct horse', name: 'Sam' });
  assert.equal(res.status, 201);
  const { user, token } = await res.json();
  assert.equal(user.email, 'sam@example.com');
  assert.equal(user.name, 'Sam');
  assert.equal(user.passwordHash, undefined, 'hash never returned');

  res = await post('/auth/signup', { email: 'sam@example.com', password: 'another password' });
  assert.equal(res.status, 409, 'duplicate email');

  res = await post('/auth/login', { email: 'sam@example.com', password: 'wrong password' });
  assert.equal(res.status, 401);
  res = await post('/auth/login', { email: 'SAM@example.com', password: 'correct horse' });
  assert.equal(res.status, 200);

  res = await fetch(`${base}/auth/me`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal((await res.json()).user.id, user.id);
  res = await fetch(`${base}/auth/me`, { headers: { authorization: 'Bearer forged.token' } });
  assert.equal(res.status, 401);

  res = await fetch(`${base}/auth/account`, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } });
  assert.equal(res.status, 200);
  res = await fetch(`${base}/auth/me`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(res.status, 401, 'deleted user is signed out');
  res = await post('/auth/login', { email: 'sam@example.com', password: 'correct horse' });
  assert.equal(res.status, 401, 'deleted user cannot sign in');
});

test('tokens expire and cannot be tampered with', () => {
  const token = issueToken('user-1', 'secret-secret-secret', 0);
  assert.equal(readToken(token, 'secret-secret-secret', 1000), 'user-1');
  assert.equal(readToken(token, 'secret-secret-secret', 91 * 86400000), null, 'expired');
  assert.equal(readToken(token, 'other-secret-secret', 1000), null, 'wrong secret');
  assert.equal(readToken(token.replace(/^./, 'x'), 'secret-secret-secret', 1000), null, 'tampered payload');
});

const profile = { focus: ['sleep'], style: 'gentle', stressResponse: 'overthink' };

test('free users get the free limit, Plus subscribers the Plus limit; failed calls are refunded', async () => {
  let res = await post('/coach/ask', { profile, question: 'How can I sleep?' }, { 'x-device-id': 'device-free-0000001' });
  assert.equal(res.status, 502);
  let body = await res.json();
  assert.deepEqual([body.limit, body.remaining, body.plus], [5, 5, false]);

  res = await post('/coach/ask', { profile, question: 'How can I sleep?' }, { 'x-device-id': 'device-plus-000001', 'x-rc-user-id': 'rc-plus-user-123' });
  body = await res.json();
  assert.deepEqual([body.limit, body.remaining, body.plus], [30, 30, true]);

  res = await post('/coach/ask', { profile, question: 'How can I sleep?' }, { 'x-device-id': 'device-fake-000001', 'x-rc-user-id': 'rc-not-subscribed' });
  body = await res.json();
  assert.equal(body.limit, 5, 'unverified RevenueCat ID gets the free limit');
});

test('RevenueCat entitlement check', async () => {
  process.env.REVENUECAT_SECRET_KEY = 'sk_test';
  const reply = (entitlements: unknown) => (async () => new Response(JSON.stringify({ subscriber: { entitlements } }), { status: 200 })) as unknown as typeof fetch;
  const now = Date.parse('2026-10-02T12:00:00Z');
  clearEntitlementCache();
  assert.equal(await hasPlus('a', reply({ plus: { expires_date: '2026-11-01T00:00:00Z' } }), now), true);
  clearEntitlementCache();
  assert.equal(await hasPlus('a', reply({ plus: { expires_date: '2026-09-01T00:00:00Z' } }), now), false, 'expired');
  clearEntitlementCache();
  assert.equal(await hasPlus('a', reply({ plus: { expires_date: null } }), now), true, 'lifetime');
  clearEntitlementCache();
  assert.equal(await hasPlus('a', reply({}), now), false, 'no entitlement');
  assert.equal(await hasPlus(null, reply({ plus: {} }), now), false);
  delete process.env.REVENUECAT_SECRET_KEY;
});
