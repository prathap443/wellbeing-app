import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { calculateStreaks, parseEntryDate } from './dates';
import { getAppUserId } from './purchases';

// Set "extra.coachApiUrl" in app.json to your deployed Replit URL.
// EXPO_PUBLIC_COACH_API_URL overrides it for local/browser previews.
// On the web the app is served by the coach server itself (see scripts/deploy-build.sh), so it can use its own origin.
const webOrigin = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : '';
export const API_URL: string = (process.env.EXPO_PUBLIC_COACH_API_URL || Constants.expoConfig?.extra?.coachApiUrl || webOrigin).replace(/\/$/, '');

export const COACH_PROFILE_KEY = 'coach_profile';
export const COACH_CONSENT_KEY = 'coach_consent';
export const COACH_SESSION_KEY = 'coach_session';
const DEVICE_KEY = 'coach_device_id';

export const FREE_DAILY_QUESTIONS = 5;

export type CoachProfile = {
  name?: string;
  focus: string[];
  style: string;
  stressResponse: string;
  recharge: string[];
};

export type CoachTool = 'breathe' | 'grounding' | 'journal' | 'checkin' | 'sleep_reset' | 'reach_out' | 'meditation' | 'anxiety_support' | 'none';

export type CoachTurn = {
  question: string;
  answer: string;
  followUps: string[];
  tool: CoachTool;
  safety: 'none' | 'concern' | 'crisis';
};

/** Today's suggestions, conversation and remaining questions, cached so reopening the screen is free. */
export type CoachSession = {
  day: string;
  suggestions: string[];
  turns: CoachTurn[];
  remaining: number;
  /** Daily allowance reported by the server: higher for Plus subscribers. */
  limit?: number;
};

export class CoachError extends Error {
  constructor(public code: 'daily_limit' | 'too_many_refreshes' | 'offline' | 'unavailable' | 'not_configured', public remaining?: number) {
    super(code);
  }
}

export const isCoachConfigured = () => API_URL.startsWith('https://') || API_URL.startsWith('http://localhost');

const todayKey = () => new Date().toLocaleDateString();

async function deviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const id = `wb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`;
  await AsyncStorage.setItem(DEVICE_KEY, id);
  return id;
}

/** Only structured data leaves the device: mood labels, check-in scores and the chosen profile. Notes and journal text are never sent. */
async function buildContext() {
  const [moodsRaw, checkInsRaw] = await AsyncStorage.multiGet(['mood_entries', 'daily_check_ins']).then((pairs) => pairs.map(([, v]) => (v ? JSON.parse(v) : [])));
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const daysAgo = (date: Date) => Math.max(0, Math.round((startOfToday - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86400000));

  const recentMoods = (moodsRaw as { mood: string; date: string; timestamp?: string }[])
    .map((entry) => ({ daysAgo: daysAgo(parseEntryDate(entry)), mood: entry.mood }))
    .filter((m) => Number.isFinite(m.daysAgo) && m.daysAgo <= 14)
    .slice(0, 14);

  const latest = (checkInsRaw as { sleep: number; energy: number; stress: number; createdAt: string }[])[0];
  const latestCheckIn = latest?.createdAt ? { daysAgo: daysAgo(new Date(latest.createdAt)), sleep: latest.sleep, energy: latest.energy, stress: latest.stress } : undefined;

  return {
    localHour: now.getHours(),
    streak: calculateStreaks(moodsRaw).current,
    recentMoods,
    latestCheckIn: latestCheckIn && latestCheckIn.daysAgo <= 7 ? latestCheckIn : undefined,
  };
}

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  if (!isCoachConfigured()) throw new CoachError('not_configured');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  const rcUser = await getAppUserId();
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-device-id': await deviceId(), ...(rcUser ? { 'x-rc-user-id': rcUser } : {}) },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new CoachError('offline');
  } finally {
    clearTimeout(timer);
  }
  // A misconfigured server can answer 200 with an HTML page; treat anything that isn't JSON as unavailable.
  const data = await response.json().catch(() => null);
  if (!data || typeof data !== 'object') throw new CoachError('unavailable');
  if (response.status === 429) throw new CoachError(data.error === 'too_many_refreshes' ? 'too_many_refreshes' : 'daily_limit', data.remaining ?? 0);
  if (!response.ok) throw new CoachError('unavailable', data.remaining);
  return data as T;
}

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);

function cleanTurn(value: any): CoachTurn | null {
  if (!value || typeof value.question !== 'string' || typeof value.answer !== 'string') return null;
  return {
    question: value.question,
    answer: value.answer,
    followUps: strings(value.followUps),
    tool: typeof value.tool === 'string' ? value.tool : 'none',
    safety: value.safety === 'crisis' || value.safety === 'concern' ? value.safety : 'none',
  };
}

/** Saved sessions are validated so a bad or older saved value can never crash the coach screen. */
export async function loadSession(): Promise<CoachSession> {
  const fresh: CoachSession = { day: todayKey(), suggestions: [], turns: [], remaining: FREE_DAILY_QUESTIONS };
  try {
    const stored = JSON.parse((await AsyncStorage.getItem(COACH_SESSION_KEY)) ?? 'null');
    if (!stored || stored.day !== todayKey()) return fresh;
    return {
      day: stored.day,
      suggestions: strings(stored.suggestions),
      turns: Array.isArray(stored.turns) ? stored.turns.map(cleanTurn).filter((t: CoachTurn | null): t is CoachTurn => !!t) : [],
      remaining: typeof stored.remaining === 'number' ? stored.remaining : FREE_DAILY_QUESTIONS,
      limit: typeof stored.limit === 'number' ? stored.limit : undefined,
    };
  } catch {
    return fresh;
  }
}

export const saveSession = (session: CoachSession) => AsyncStorage.setItem(COACH_SESSION_KEY, JSON.stringify(session));

export async function fetchSuggestions(profile: CoachProfile): Promise<{ questions: string[]; remaining: number; limit: number }> {
  const data = await post<{ questions?: unknown; remaining?: unknown; limit?: unknown }>('/coach/suggestions', { profile, context: await buildContext() });
  return {
    questions: strings(data.questions),
    remaining: typeof data.remaining === 'number' ? data.remaining : FREE_DAILY_QUESTIONS,
    limit: typeof data.limit === 'number' ? data.limit : FREE_DAILY_QUESTIONS,
  };
}

export async function askCoach(profile: CoachProfile, question: string, history: CoachTurn[]): Promise<CoachTurn & { remaining: number; limit: number }> {
  const data = await post<{ answer: string; follow_ups: string[]; suggested_tool: CoachTool; safety: CoachTurn['safety']; remaining: number; limit: number }>('/coach/ask', {
    profile,
    question,
    context: await buildContext(),
    history: history.slice(-3).map((t) => ({ question: t.question, answer: t.answer })),
  });
  if (typeof data.answer !== 'string' || !data.answer) throw new CoachError('unavailable');
  return {
    question,
    answer: data.answer,
    followUps: strings(data.follow_ups),
    tool: data.suggested_tool ?? 'none',
    safety: data.safety ?? 'none',
    remaining: typeof data.remaining === 'number' ? data.remaining : 0,
    limit: typeof data.limit === 'number' ? data.limit : FREE_DAILY_QUESTIONS,
  };
}
