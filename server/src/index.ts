import express, { type Request, type Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { MODEL, answerQuestion, suggestQuestions } from './coach.js';
import { cleanText, parseContext, parseHistory, parseProfile } from './profile.js';
import { FREE_DAILY_QUESTIONS, pruneQuotas, questionsRemaining, refundQuestion, takeQuestion, takeSuggestionRefresh } from './quota.js';

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is not set. Add it in Replit → Secrets.');
  process.exit(1);
}

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
  res.json({ ok: true, model: MODEL, freeDailyQuestions: FREE_DAILY_QUESTIONS });
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

setInterval(() => pruneQuotas(), 60 * 60 * 1000).unref();

const port = Number(process.env.PORT ?? 3000);
app.listen(port, '0.0.0.0', () => console.log(`Wellbeing coach listening on :${port} using ${MODEL}`));
