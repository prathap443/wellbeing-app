import AsyncStorage from '@react-native-async-storage/async-storage';

// Habits: a few small actions the person chooses, each with a "tiny version" that always counts.
// Some tick themselves from what the person already did in the app (never stored, always recomputed),
// so unticking can't fight with them and history stays honest.

export const RECORDS_KEY = 'habit_records';
export const CONFIG_KEY = 'habit_config';
export const MAX_ACTIVE = 5;
export const STEP_GOALS = [2000, 4000, 6000, 8000];

export type AutoSource = 'activity' | 'sleep_reset' | 'steps' | 'journal' | 'mood';
export type HabitDef = { id: string; title: string; tiny: string; icon: string; color: string; auto?: AutoSource; custom?: boolean };
export type HabitConfig = { version: 1; active: string[]; custom: { id: string; title: string; tiny: string }[]; stepGoal: number };
/** Day ("YYYY-MM-DD", local) -> ids ticked by hand that day. */
export type HabitRecords = Record<string, string[]>;

// Ids of the original five are kept so existing history and backups carry over.
export const LIBRARY: HabitDef[] = [
  { id: 'meditation', title: 'Mindful moment', tiny: 'Three slow breaths', icon: 'leaf-outline', color: '#5eead4', auto: 'activity' },
  { id: 'movement', title: 'Movement', tiny: 'Stand and stretch for a minute', icon: 'walk-outline', color: '#34d399', auto: 'steps' },
  { id: 'sleep', title: 'Sleep routine', tiny: 'Put your phone down 10 minutes earlier', icon: 'moon-outline', color: '#a78bfa', auto: 'sleep_reset' },
  { id: 'water', title: 'Drink water', tiny: 'One glass', icon: 'water-outline', color: '#60a5fa' },
  { id: 'connection', title: 'Connect with someone', tiny: 'Send one message', icon: 'people-outline', color: '#fbbf24' },
  { id: 'outside', title: 'Get outside', tiny: 'Step outside for two minutes', icon: 'sunny-outline', color: '#fb923c' },
  { id: 'reflect', title: 'Reflect', tiny: 'Write one sentence in Journal', icon: 'book-outline', color: '#c4b5fd', auto: 'journal' },
  { id: 'checkin', title: 'Check in with myself', tiny: 'Log your mood', icon: 'happy-outline', color: '#f472b6', auto: 'mood' },
];
const ORIGINAL_FIVE = ['sleep', 'water', 'movement', 'meditation', 'connection'];
const NEW_USER_DEFAULT = ['meditation', 'movement', 'sleep'];
export const BUILT_IN_IDS = LIBRARY.map((h) => h.id);
export const isCustomId = (id: string) => /^c-[a-z0-9-]{4,40}$/.test(id);

// ---------- Dates ----------
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** The last n days, oldest first, ending today. */
export function lastDays(n: number, now = new Date()): Date[] {
  return Array.from({ length: n }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - (n - 1 - i)));
}

/**
 * Older versions keyed days with toLocaleDateString(), which depends on the phone's region settings.
 * Converts any key that matches one of the last two years in the current format; anything else is kept as is.
 */
export function migrateRecordKeys(records: HabitRecords, now = new Date(), toLocal = (d: Date) => d.toLocaleDateString()): { records: HabitRecords; changed: boolean } {
  const out: HabitRecords = {};
  let changed = false;
  const lookup = new Map<string, string>();
  for (const d of lastDays(731, now)) lookup.set(toLocal(d), dayKey(d));
  for (const [key, ids] of Object.entries(records)) {
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : lookup.get(key);
    const target = iso ?? key;
    if (target !== key) changed = true;
    out[target] = Array.from(new Set([...(out[target] ?? []), ...ids]));
  }
  return { records: out, changed };
}

// ---------- Config ----------
export function defaultConfig(records: HabitRecords): HabitConfig {
  const used = Object.values(records).some((ids) => ids.length > 0);
  return { version: 1, active: used ? [...ORIGINAL_FIVE] : [...NEW_USER_DEFAULT], custom: [], stepGoal: 4000 };
}

export function cleanConfig(raw: unknown, records: HabitRecords): HabitConfig {
  const base = defaultConfig(records);
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<HabitConfig>;
  const custom = Array.isArray(r.custom)
    ? r.custom.filter((c) => c && typeof c.id === 'string' && isCustomId(c.id) && typeof c.title === 'string' && c.title.trim())
      .map((c) => ({ id: c.id, title: c.title.trim().slice(0, 60), tiny: typeof c.tiny === 'string' ? c.tiny.trim().slice(0, 80) : '' }))
    : [];
  const known = new Set([...BUILT_IN_IDS, ...custom.map((c) => c.id)]);
  const active = Array.isArray(r.active) ? Array.from(new Set(r.active.filter((id) => typeof id === 'string' && known.has(id)))).slice(0, MAX_ACTIVE) : base.active;
  const stepGoal = STEP_GOALS.includes(r.stepGoal as number) ? (r.stepGoal as number) : base.stepGoal;
  return { version: 1, active, custom, stepGoal };
}

export function habitDefs(config: HabitConfig): HabitDef[] {
  const custom: HabitDef[] = config.custom.map((c) => ({ id: c.id, title: c.title, tiny: c.tiny, icon: 'star-outline', color: '#fcd34d', custom: true }));
  const all = [...LIBRARY, ...custom];
  return config.active.map((id) => all.find((h) => h.id === id)).filter((h): h is HabitDef => !!h);
}

export const newCustomId = () => `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// ---------- Automatic ticks ----------
export type AutoInputs = {
  /** Mindful-type sessions: local start time and seconds. */
  sessions: { startedAt: string; durationSec: number; completed: boolean }[];
  /** Times of journal reflections and mood logs. */
  journalTimes: string[];
  moodTimes: string[];
  /** Steps per local day key, when Apple Health is connected. */
  steps: Record<string, number>;
  /** Sleep reset items ticked tonight (only today is known). */
  sleepResetTonight: number;
};
const localKeyOf = (iso: string) => { const t = Date.parse(iso); return Number.isNaN(t) ? null : dayKey(new Date(t)); };

/** Why a habit counts as done automatically on a given day, or null. */
export function autoReason(habit: HabitDef, day: string, today: string, inputs: AutoInputs, stepGoal: number): string | null {
  switch (habit.auto) {
    case 'activity': {
      const s = inputs.sessions.filter((x) => localKeyOf(x.startedAt) === day && (x.completed || x.durationSec >= 60));
      if (!s.length) return null;
      const mins = Math.max(1, Math.round(s.reduce((t, x) => t + x.durationSec, 0) / 60));
      return `${mins} min of calm in the app`;
    }
    case 'journal': return inputs.journalTimes.some((t) => localKeyOf(t) === day) ? 'You wrote in Journal' : null;
    case 'mood': return inputs.moodTimes.some((t) => localKeyOf(t) === day) ? 'You logged your mood' : null;
    case 'steps': { const n = inputs.steps[day]; return n != null && n >= stepGoal ? `${n.toLocaleString()} steps` : null; }
    case 'sleep_reset': return day === today && inputs.sleepResetTonight >= 3 ? 'Sleep reset done tonight' : null;
    default: return null;
  }
}

/** Done that day: ticked by hand, or automatically. */
export function doneOn(habit: HabitDef, day: string, today: string, records: HabitRecords, inputs: AutoInputs, stepGoal: number): boolean {
  return !!records[day]?.includes(habit.id) || autoReason(habit, day, today, inputs, stepGoal) !== null;
}

/** Days in the last 7 (including today) with at least one active habit done. */
export function daysShownUp(defs: HabitDef[], records: HabitRecords, inputs: AutoInputs, stepGoal: number, now = new Date()): boolean[] {
  const today = dayKey(now);
  return lastDays(7, now).map((d) => defs.some((h) => doneOn(h, dayKey(d), today, records, inputs, stepGoal)));
}

// ---------- Storage (fails safely: never saves over data it couldn't read) ----------
export type HabitState = { records: HabitRecords; config: HabitConfig; weeklyGoal: number };

export async function loadHabits(now = new Date()): Promise<{ ok: true; state: HabitState; migrated: boolean } | { ok: false }> {
  let rawRecords: string | null, rawConfig: string | null, rawGoal: string | null;
  try {
    [rawRecords, rawConfig, rawGoal] = (await AsyncStorage.multiGet([RECORDS_KEY, CONFIG_KEY, 'weekly_habit_goal'])).map(([, v]) => v);
  } catch { return { ok: false }; }
  let parsed: unknown = {};
  try { parsed = rawRecords ? JSON.parse(rawRecords) : {}; } catch {
    try { await AsyncStorage.setItem(`${RECORDS_KEY}_unreadable`, rawRecords!); } catch { return { ok: false }; }
    parsed = {};
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false };
  const clean: HabitRecords = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) if (Array.isArray(v)) clean[k] = v.filter((x): x is string => typeof x === 'string');
  const { records, changed } = migrateRecordKeys(clean, now);
  let config: unknown = null;
  try { config = rawConfig ? JSON.parse(rawConfig) : null; } catch { config = null; }
  const goal = Number(rawGoal);
  return { ok: true, state: { records, config: cleanConfig(config, records), weeklyGoal: [3, 4, 5, 7].includes(goal) ? goal : 4 }, migrated: changed };
}

export const saveRecords = (records: HabitRecords) => AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(records));
export const saveConfig = (config: HabitConfig) => AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(config));
export const saveWeeklyGoal = (goal: number) => AsyncStorage.setItem('weekly_habit_goal', String(goal));
