import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

const { createApp } = await import('./app.js');
const { MemoryUserStore } = await import('./accounts.js');
const { renderMarkdown } = await import('./pages.js');

const sent: { to: string; subject: string; text: string }[] = [];
const servers: Server[] = [];
async function start(withMail: boolean) {
  const app = createApp({
    users: new MemoryUserStore(),
    sessionSecret: 'test-secret-at-least-16-chars',
    coachEnabled: false,
    plusCheck: async () => false,
    sendMail: withMail ? async (to, subject, text) => void sent.push({ to, subject, text }) : null,
  });
  const server = app.listen(0);
  servers.push(server);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = (path: string, body: unknown) =>
    fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { base, post };
}
let api: Awaited<ReturnType<typeof start>>;
before(async () => { api = await start(true); });
after(() => servers.forEach((s) => s.close()));

const codeFrom = (text: string) => /(\d{6})/.exec(text)![1];

test('unknown email gets the same answer and no email', async () => {
  const res = await api.post('/auth/reset/request', { email: 'nobody@example.com' });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { sent: true });
  assert.equal(sent.length, 0);
});

test('full reset: code by email, wrong guesses, new password works, code is single-use', async () => {
  await api.post('/auth/signup', { email: 'reset@example.com', password: 'old password 1' });
  let res = await api.post('/auth/reset/request', { email: ' Reset@Example.com ' });
  assert.equal(res.status, 200);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'reset@example.com');
  const code = codeFrom(sent[0].text);
  assert.match(sent[0].subject, new RegExp(code));

  res = await api.post('/auth/reset/request', { email: 'reset@example.com' });
  assert.equal(sent.length, 1, 'no second email within a minute');

  const wrong = code === '000000' ? '111111' : '000000';
  res = await api.post('/auth/reset/confirm', { email: 'reset@example.com', code: wrong, password: 'new password 1' });
  assert.equal((await res.json()).error, 'invalid_code');

  res = await api.post('/auth/reset/confirm', { email: 'reset@example.com', code, password: 'short' });
  assert.equal((await res.json()).error, 'weak_password', 'weak password rejected without using up the code');

  res = await api.post('/auth/reset/confirm', { email: 'reset@example.com', code: `${code.slice(0, 3)} ${code.slice(3)}`, password: 'new password 1' });
  assert.equal(res.status, 200, 'spaces in the code are ignored');
  const body = await res.json();
  assert.ok(body.token);
  assert.equal(body.user.email, 'reset@example.com');
  assert.equal(body.user.passwordHash, undefined, 'hash never returned');

  assert.equal((await api.post('/auth/login', { email: 'reset@example.com', password: 'old password 1' })).status, 401);
  assert.equal((await api.post('/auth/login', { email: 'reset@example.com', password: 'new password 1' })).status, 200);

  res = await api.post('/auth/reset/confirm', { email: 'reset@example.com', code, password: 'another password' });
  assert.equal((await res.json()).error, 'code_expired', 'code cannot be reused');
});

test('five wrong guesses burn the code', async () => {
  await api.post('/auth/signup', { email: 'guess@example.com', password: 'old password 1' });
  await api.post('/auth/reset/request', { email: 'guess@example.com' });
  const code = codeFrom(sent.at(-1)!.text);
  const wrong = code === '123456' ? '654321' : '123456';
  const errors: string[] = [];
  for (let i = 0; i < 5; i++) {
    const res = await api.post('/auth/reset/confirm', { email: 'guess@example.com', code: wrong, password: 'new password 1' });
    errors.push((await res.json()).error);
  }
  assert.deepEqual(errors, ['invalid_code', 'invalid_code', 'invalid_code', 'invalid_code', 'code_expired']);
  const res = await api.post('/auth/reset/confirm', { email: 'guess@example.com', code, password: 'new password 1' });
  assert.equal((await res.json()).error, 'code_expired', 'right code no longer works');
});

test('reset is unavailable without email settings', async () => {
  const noMail = await start(false);
  const res = await noMail.post('/auth/reset/request', { email: 'a@example.com' });
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'reset_unavailable');
});

test('privacy and support pages are served', async () => {
  for (const path of ['/privacy', '/support']) {
    const res = await fetch(api.base + path);
    assert.equal(res.status, 200, path);
    const html = await res.text();
    assert.match(html, /wellbeingsupport247@gmail\.com/, `${path} shows the support email`);
  }
});

test('markdown renderer escapes HTML and only links safe URLs', () => {
  const html = renderMarkdown('# T\n\nHi <b>x</b> [ok](https://a.com) [bad](javascript:alert(1))\n\n- one\n- **two**');
  assert.match(html, /&lt;b&gt;/);
  assert.match(html, /<a href="https:\/\/a.com">ok<\/a>/);
  assert.doesNotMatch(html, /href="javascript/);
  assert.match(html, /<li><strong>two<\/strong><\/li>/);
});
