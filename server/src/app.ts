import path from 'node:path';
import express, { type Request, type Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { MODEL, answerQuestion, suggestQuestions } from './coach.js';
import { cleanText, parseContext, parseHistory, parseProfile } from './profile.js';
import { FREE_DAILY_QUESTIONS, PLUS_DAILY_QUESTIONS, questionsRemaining, refundQuestion, takeQuestion, takeSuggestionRefresh } from './quota.js';
import { type UserStore, RESET_CODE_MINUTES, RESET_MAX_ATTEMPTS, hashPassword, hashResetCode, issueToken, newResetCode, normaliseEmail, readToken, sameHash, validPassword, verifyPassword } from './accounts.js';
import { type Mailer, resetEmail } from './mailer.js';
import { registerPages } from './pages.js';
import { hasPlus } from './entitlements.js';

export type AppOptions = {
  users: UserStore;
  sessionSecret: string | null;
  coachEnabled: boolean;
  plusCheck?: (appUserId: string | null) => Promise<boolean>;
  webDist?: string;
  /** Sends password reset codes; null when SMTP is not configured. */
  sendMail?: Mailer | null;
  /** Reported by /health so you can confirm the database is connected. */
  database?: boolean;
};

// The app generates a random ID per install. It is not tied to any identity.
const deviceIdOf = (req: Request): string | null => {
  const id = req.get('x-device-id') ?? '';
  return /^[a-zA-Z0-9-]{16,64}$/.test(id) ? id : null;
};

// RevenueCat app user ID: the account ID when signed in, otherwise RevenueCat's anonymous ID.
const rcUserOf = (req: Request): string | null => {
  const id = req.get('x-rc-user-id') ?? '';
  return /^[\w$:.-]{8,200}$/.test(id) ? id : null;
};

// Never log request bodies: they contain personal wellbeing data.
const logError = (route: string, err: unknown) => {
  // Anthropic error messages describe the request problem, not the user's content.
  if (err instanceof Anthropic.APIError) console.error(`${route}: Anthropic ${err.status ?? 'connection'} ${err.name}: ${err.message.slice(0, 300)}`);
  else console.error(`${route}: ${(err as Error)?.message ?? err}`);
};

// Slows down password guessing: 20 sign-in/sign-up attempts per IP per hour.
const authAttempts = new Map<string, { count: number; resetAt: number }>();
function allowAuthAttempt(ip: string, now = Date.now()): boolean {
  const entry = authAttempts.get(ip);
  if (!entry || entry.resetAt < now) {
    authAttempts.set(ip, { count: 1, resetAt: now + 3600_000 });
    return true;
  }
  entry.count += 1;
  return entry.count <= 20;
}

export function createApp({ users, sessionSecret, coachEnabled, plusCheck = (id) => hasPlus(id), webDist, sendMail = null, database = false }: AppOptions) {
  const app = express();
  app.set('trust proxy', true); // Replit sits behind a proxy; needed for req.ip
  app.use(express.json({ limit: '32kb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, coach: coachEnabled, accounts: !!sessionSecret, database, email: !!sendMail, model: MODEL, freeDailyQuestions: FREE_DAILY_QUESTIONS, plusDailyQuestions: PLUS_DAILY_QUESTIONS });
  });

  // ---------- Accounts ----------
  const accountsReady = (res: Response) => {
    if (sessionSecret) return true;
    res.status(503).json({ error: 'accounts_unavailable' });
    return false;
  };
  const currentUserId = (req: Request) => readToken(req.get('authorization')?.replace(/^Bearer /, ''), sessionSecret ?? '');

  app.post('/auth/signup', async (req, res) => {
    if (!accountsReady(res)) return;
    if (!allowAuthAttempt(req.ip ?? 'unknown')) return void res.status(429).json({ error: 'too_many_attempts' });
    const email = normaliseEmail(req.body?.email);
    const password = req.body?.password;
    const name = cleanText(req.body?.name, 40) || null;
    if (!email) return void res.status(400).json({ error: 'invalid_email' });
    if (!validPassword(password)) return void res.status(400).json({ error: 'weak_password' });
    try {
      const user = await users.create(email, name, await hashPassword(password));
      if (!user) return void res.status(409).json({ error: 'email_taken' });
      res.status(201).json({ user, token: issueToken(user.id, sessionSecret!) });
    } catch (err) {
      logError('signup', err);
      res.status(500).json({ error: 'server_error' });
    }
  });

  app.post('/auth/login', async (req, res) => {
    if (!accountsReady(res)) return;
    if (!allowAuthAttempt(req.ip ?? 'unknown')) return void res.status(429).json({ error: 'too_many_attempts' });
    const email = normaliseEmail(req.body?.email);
    const password = req.body?.password;
    try {
      const stored = email && typeof password === 'string' ? await users.findByEmail(email) : null;
      if (!stored || !(await verifyPassword(password, stored.passwordHash))) return void res.status(401).json({ error: 'wrong_credentials' });
      const { passwordHash: _, ...user } = stored;
      res.json({ user, token: issueToken(user.id, sessionSecret!) });
    } catch (err) {
      logError('login', err);
      res.status(500).json({ error: 'server_error' });
    }
  });

  app.get('/auth/me', async (req, res) => {
    if (!accountsReady(res)) return;
    const userId = currentUserId(req);
    const user = userId ? await users.findById(userId).catch(() => null) : null;
    if (!user) return void res.status(401).json({ error: 'signed_out' });
    res.json({ user });
  });

  // ---------- Password reset: a 6-digit code by email ----------
  // Always answers "sent" for unknown emails, so the form can't be used to find out who has an account.
  app.post('/auth/reset/request', async (req, res) => {
    if (!accountsReady(res)) return;
    if (!allowAuthAttempt(req.ip ?? 'unknown')) return void res.status(429).json({ error: 'too_many_attempts' });
    const email = normaliseEmail(req.body?.email);
    if (!email) return void res.status(400).json({ error: 'invalid_email' });
    if (!sendMail) return void res.status(503).json({ error: 'reset_unavailable' });
    try {
      const user = await users.findByEmail(email);
      if (user) {
        const existing = await users.getReset(email);
        // At most one email a minute per address, so the form can't be used to flood someone's inbox.
        const sentRecently = existing && existing.expiresAt - RESET_CODE_MINUTES * 60_000 > Date.now() - 60_000;
        if (!sentRecently) {
          const code = newResetCode();
          await users.saveReset(email, hashResetCode(email, code, sessionSecret!), Date.now() + RESET_CODE_MINUTES * 60_000);
          const { subject, text } = resetEmail(code, RESET_CODE_MINUTES);
          await sendMail(email, subject, text);
        }
      }
      res.json({ sent: true });
    } catch (err) {
      logError('reset-request', err);
      res.status(502).json({ error: 'email_failed' });
    }
  });

  app.post('/auth/reset/confirm', async (req, res) => {
    if (!accountsReady(res)) return;
    if (!allowAuthAttempt(req.ip ?? 'unknown')) return void res.status(429).json({ error: 'too_many_attempts' });
    const email = normaliseEmail(req.body?.email);
    const code = typeof req.body?.code === 'string' ? req.body.code.replace(/\s+/g, '') : '';
    const password = req.body?.password;
    if (!email || !/^\d{6}$/.test(code)) return void res.status(400).json({ error: 'invalid_code' });
    if (!validPassword(password)) return void res.status(400).json({ error: 'weak_password' });
    try {
      const reset = await users.getReset(email);
      if (!reset || reset.expiresAt < Date.now() || reset.attempts >= RESET_MAX_ATTEMPTS) {
        if (reset) await users.clearReset(email);
        return void res.status(400).json({ error: 'code_expired' });
      }
      if (!sameHash(reset.codeHash, hashResetCode(email, code, sessionSecret!))) {
        const attempts = await users.bumpReset(email);
        if (attempts >= RESET_MAX_ATTEMPTS) await users.clearReset(email);
        return void res.status(400).json({ error: attempts >= RESET_MAX_ATTEMPTS ? 'code_expired' : 'invalid_code' });
      }
      const stored = await users.findByEmail(email);
      if (!stored) return void res.status(400).json({ error: 'code_expired' });
      await users.setPassword(stored.id, await hashPassword(password));
      await users.clearReset(email);
      const { passwordHash: _, ...user } = stored;
      res.json({ user, token: issueToken(user.id, sessionSecret!) });
    } catch (err) {
      logError('reset-confirm', err);
      res.status(500).json({ error: 'server_error' });
    }
  });

  // Apple requires in-app account deletion (guideline 5.1.1(v)).
  app.delete('/auth/account', async (req, res) => {
    if (!accountsReady(res)) return;
    const userId = currentUserId(req);
    if (!userId) return void res.status(401).json({ error: 'signed_out' });
    try {
      await users.delete(userId);
      res.json({ deleted: true });
    } catch (err) {
      logError('delete-account', err);
      res.status(500).json({ error: 'server_error' });
    }
  });

  // ---------- Coach ----------
  app.use('/coach', (_req, res, next) => {
    if (coachEnabled) next();
    else res.status(503).json({ error: 'coach_unavailable' });
  });

  /** Plus subscribers get a higher limit, counted against their RevenueCat ID so it follows them across devices. */
  const quotaFor = async (req: Request, deviceId: string) => {
    const rcUser = rcUserOf(req);
    if (rcUser && (await plusCheck(rcUser))) return { key: `rc:${rcUser}`, limit: PLUS_DAILY_QUESTIONS, plus: true };
    return { key: deviceId, limit: FREE_DAILY_QUESTIONS, plus: false };
  };

  app.post('/coach/suggestions', async (req: Request, res: Response) => {
    const deviceId = deviceIdOf(req);
    const profile = parseProfile(req.body?.profile);
    if (!deviceId || !profile) return void res.status(400).json({ error: 'invalid_request' });
    const quota = await quotaFor(req, deviceId);
    const status = () => ({ remaining: questionsRemaining(quota.key, quota.limit), limit: quota.limit, plus: quota.plus });
    if (!takeSuggestionRefresh(deviceId, req.ip ?? 'unknown')) return void res.status(429).json({ error: 'too_many_refreshes', ...status() });
    try {
      const questions = await suggestQuestions(profile, parseContext(req.body?.context));
      res.json({ questions, ...status() });
    } catch (err) {
      logError('suggestions', err);
      res.status(502).json({ error: 'coach_unavailable', ...status() });
    }
  });

  app.post('/coach/ask', async (req: Request, res: Response) => {
    const deviceId = deviceIdOf(req);
    const profile = parseProfile(req.body?.profile);
    const question = cleanText(req.body?.question, 200);
    if (!deviceId || !profile || !question) return void res.status(400).json({ error: 'invalid_request' });
    const ip = req.ip ?? 'unknown';
    const quota = await quotaFor(req, deviceId);
    const status = () => ({ remaining: questionsRemaining(quota.key, quota.limit), limit: quota.limit, plus: quota.plus });
    if (!takeQuestion(quota.key, ip, quota.limit)) return void res.status(429).json({ error: 'daily_limit', ...status(), remaining: 0 });
    try {
      const { refunded, ...result } = await answerQuestion(profile, parseContext(req.body?.context), parseHistory(req.body?.history), question);
      if (refunded) refundQuestion(quota.key, ip);
      res.json({ ...result, ...status() });
    } catch (err) {
      refundQuestion(quota.key, ip);
      logError('ask', err);
      res.status(502).json({ error: 'coach_unavailable', ...status() });
    }
  });

  // Public privacy policy and support pages for the App Store listing.
  registerPages(app);

  // Browser preview: serve the exported web app from the same origin (see scripts/preview-web.sh).
  if (webDist) {
    const dist = path.resolve(webDist);
    app.use(express.static(dist));
    app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(path.join(dist, 'index.html')) : next()));
  }

  return app;
}
