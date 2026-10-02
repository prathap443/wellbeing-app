// Everything the app sends is validated against fixed vocabularies, so the
// public endpoint cannot be used to inject arbitrary instructions via profile data.

export const FOCUS = ['stress', 'anxiety', 'low_mood', 'sleep', 'confidence', 'relationships', 'work_focus', 'self_care'] as const;
export const STYLE = ['gentle', 'practical', 'reflective'] as const;
export const STRESS_RESPONSE = ['overthink', 'withdraw', 'keep_busy', 'irritable', 'shut_down'] as const;
export const RECHARGE = ['alone_time', 'people', 'movement', 'nature', 'creativity', 'rest'] as const;
export const MOODS = ['great', 'good', 'okay', 'bad', 'very_bad'] as const;
export const TOOLS = ['breathe', 'grounding', 'journal', 'checkin', 'sleep_reset', 'reach_out', 'meditation', 'anxiety_support', 'none'] as const;

export type Profile = {
  name?: string;
  focus: (typeof FOCUS)[number][];
  style: (typeof STYLE)[number];
  stressResponse: (typeof STRESS_RESPONSE)[number];
  recharge: (typeof RECHARGE)[number][];
};

export type Context = {
  localHour?: number;
  streak?: number;
  recentMoods: { daysAgo: number; mood: (typeof MOODS)[number] }[];
  latestCheckIn?: { daysAgo: number; sleep: number; energy: number; stress: number };
};

export type Turn = { question: string; answer: string };

const pick = <T extends readonly string[]>(allowed: T, value: unknown): T[number] | undefined =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T[number]) : undefined;

const pickMany = <T extends readonly string[]>(allowed: T, value: unknown, max: number): T[number][] =>
  Array.isArray(value) ? [...new Set(value.map((v) => pick(allowed, v)).filter((v): v is T[number] => !!v))].slice(0, max) : [];

const int = (value: unknown, min: number, max: number): number | undefined =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : undefined;

/** Strips anything that is not a plain short string (used for the optional first name and chat text). */
export const cleanText = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';

export function parseProfile(raw: unknown): Profile | null {
  const p = (raw ?? {}) as Record<string, unknown>;
  const style = pick(STYLE, p.style);
  const stressResponse = pick(STRESS_RESPONSE, p.stressResponse);
  const focus = pickMany(FOCUS, p.focus, 4);
  if (!style || !stressResponse || focus.length === 0) return null;
  const name = cleanText(p.name, 30).replace(/[^\p{L}\p{M}' -]/gu, '');
  return { name: name || undefined, focus, style, stressResponse, recharge: pickMany(RECHARGE, p.recharge, 4) };
}

export function parseContext(raw: unknown): Context {
  const c = (raw ?? {}) as Record<string, unknown>;
  const moods = Array.isArray(c.recentMoods) ? c.recentMoods : [];
  const recentMoods = moods
    .map((m) => ({ daysAgo: int((m as any)?.daysAgo, 0, 30), mood: pick(MOODS, (m as any)?.mood) }))
    .filter((m): m is Context['recentMoods'][number] => m.daysAgo !== undefined && !!m.mood)
    .slice(0, 14);
  const ci = (c.latestCheckIn ?? null) as Record<string, unknown> | null;
  const checkIn = ci && {
    daysAgo: int(ci.daysAgo, 0, 30),
    sleep: int(ci.sleep, 1, 5),
    energy: int(ci.energy, 1, 5),
    stress: int(ci.stress, 1, 5),
  };
  return {
    localHour: int(c.localHour, 0, 23),
    streak: int(c.streak, 0, 10000),
    recentMoods,
    latestCheckIn: checkIn && checkIn.daysAgo !== undefined && checkIn.sleep && checkIn.energy && checkIn.stress ? (checkIn as Context['latestCheckIn']) : undefined,
  };
}

export function parseHistory(raw: unknown): Turn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(-3)
    .map((t) => ({ question: cleanText((t as any)?.question, 200), answer: cleanText((t as any)?.answer, 1500) }))
    .filter((t) => t.question && t.answer);
}

const LABELS: Record<string, string> = {
  stress: 'stress', anxiety: 'anxiety', low_mood: 'low mood', sleep: 'sleep', confidence: 'confidence',
  relationships: 'relationships', work_focus: 'work and focus', self_care: 'self-care habits',
  gentle: 'gentle and reassuring', practical: 'practical and direct', reflective: 'curious and reflective',
  overthink: 'overthinks', withdraw: 'withdraws from people', keep_busy: 'keeps busy to avoid feelings',
  irritable: 'gets irritable', shut_down: 'shuts down',
  alone_time: 'time alone', people: 'time with people', movement: 'movement', nature: 'nature', creativity: 'creativity', rest: 'rest',
  very_bad: 'very bad',
};
const label = (v: string) => LABELS[v] ?? v;

/** Renders validated data as plain text for the model. Contains no free-form user text except an optional first name. */
export function describeUser(profile: Profile, context: Context): string {
  const lines = [
    `Name: ${profile.name ?? 'not given'}`,
    `Wants help with: ${profile.focus.map(label).join(', ')}`,
    `Prefers a coaching style that is: ${label(profile.style)}`,
    `Under stress, tends to: ${label(profile.stressResponse)}`,
    `Recharges through: ${profile.recharge.length ? profile.recharge.map(label).join(', ') : 'not given'}`,
  ];
  if (context.localHour !== undefined) lines.push(`Local time: ${context.localHour}:00`);
  if (context.streak) lines.push(`Check-in streak: ${context.streak} days`);
  if (context.recentMoods.length) {
    lines.push(`Recent moods (newest first): ${context.recentMoods.map((m) => `${m.daysAgo === 0 ? 'today' : `${m.daysAgo}d ago`} ${label(m.mood)}`).join('; ')}`);
  } else {
    lines.push('Recent moods: none logged yet');
  }
  if (context.latestCheckIn) {
    const c = context.latestCheckIn;
    lines.push(`Latest check-in (${c.daysAgo === 0 ? 'today' : `${c.daysAgo}d ago`}, 1-5): sleep ${c.sleep}, energy ${c.energy}, stress ${c.stress} (5 = overwhelmed)`);
  }
  return lines.join('\n');
}
