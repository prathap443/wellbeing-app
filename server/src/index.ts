import path from 'node:path';
import express, { type Request, type Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { MODEL, answerQuestion, suggestQuestions } from './coach.js';
import { cleanText, parseContext, parseHistory, parseProfile } from './profile.js';
import { FREE_DAILY_QUESTIONS, pruneQuotas, questionsRemaining, refundQuestion, takeQuestion, takeSuggestionRefresh } from './quota.js';

const HAS_KEY = !!process.env.ANTHROPIC_API_KEY;
if (!HAS_KEY) console.warn('ANTHROPIC_API_KEY is not set (Replit → Secrets). Coach endpoints will return 503.');

const app = express();
app.set('trust proxy', true); // Replit sits behind a proxy; needed for req.ip
app.use(express.json({ limit: '32kb' }));

// The app generates a random ID per install. It is not tied to any identity.
const deviceIdOf = (req: Request): string | null => {
  const id = req.get('x-device-id') ?? '';
  return /^[a-zA-Z0-9-]{16,64}$/.test(id) ? id : null;
};

// Never log request bodies: they contain personal wellbeing data.
const logError = (route: string, err: unknown) => {
  if (err instanceof Anthropic.APIError) console.error(`${route}: Anthropic ${err.status} ${err.name}`);
  else console.error(`${route}: ${(err as Error)?.message ?? err}`);
};

app.get('/health', (_req, res) => {
  res.json({ ok: true, coach: HAS_KEY, model: MODEL, freeDailyQuestions: FREE_DAILY_QUESTIONS });
});

app.use('/coach', (_req, res, next) => {
  if (HAS_KEY) next();
  else res.status(503).json({ error: 'coach_unavailable' });
});

app.post('/coach/suggestions', async (req: Request, res: Response) => {
  const deviceId = deviceIdOf(req);
  const profile = parseProfile(req.body?.profile);
  if (!deviceId || !profile) {
    res.status(400).json({ error: 'invalid_request' });
    return;
  }
  if (!takeSuggestionRefresh(deviceId, req.ip ?? 'unknown')) {
    res.status(429).json({ error: 'too_many_refreshes', remaining: questionsRemaining(deviceId) });
    return;
  }
  try {
    const questions = await suggestQuestions(profile, parseContext(req.body?.context));
    res.json({ questions, remaining: questionsRemaining(deviceId) });
  } catch (err) {
    logError('suggestions', err);
    res.status(502).json({ error: 'coach_unavailable' });
  }
});

app.post('/coach/ask', async (req: Request, res: Response) => {
  const deviceId = deviceIdOf(req);
  const profile = parseProfile(req.body?.profile);
  const question = cleanText(req.body?.question, 200);
  if (!deviceId || !profile || !question) {
    res.status(400).json({ error: 'invalid_request' });
    return;
  }
  const ip = req.ip ?? 'unknown';
  if (!takeQuestion(deviceId, ip)) {
    res.status(429).json({ error: 'daily_limit', remaining: 0, limit: FREE_DAILY_QUESTIONS });
    return;
  }
  try {
    const { refunded, ...result } = await answerQuestion(profile, parseContext(req.body?.context), parseHistory(req.body?.history), question);
    if (refunded) refundQuestion(deviceId, ip);
    res.json({ ...result, remaining: questionsRemaining(deviceId) });
  } catch (err) {
    refundQuestion(deviceId, ip);
    logError('ask', err);
    res.status(502).json({ error: 'coach_unavailable', remaining: questionsRemaining(deviceId) });
  }
});

// Browser preview: serve the exported web app from the same origin (see scripts/preview-web.sh).
if (process.env.WEB_DIST) {
  const dist = path.resolve(process.env.WEB_DIST);
  app.use(express.static(dist));
  app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(path.join(dist, 'index.html')) : next()));
}

setInterval(() => pruneQuotas(), 60 * 60 * 1000).unref();

const port = Number(process.env.PORT ?? 3000);
// Express 5 passes listen errors (e.g. port already in use) to this callback.
app.listen(port, '0.0.0.0', (error?: Error) => {
  if (error) {
    console.error(`Could not start on port ${port}: ${error.message}`);
    console.error('Another program is using this port. Press Stop in Replit (or run: pkill -f expo) and try again.');
    process.exit(1);
  }
  console.log(`Wellbeing coach listening on :${port} using ${MODEL}`);
});
