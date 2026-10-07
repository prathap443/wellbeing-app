import AsyncStorage from '@react-native-async-storage/async-storage';

// Activity history: one record per tool session, stored only on this device.
// Included in backups and Clear All Data; never sent to the AI coach or our server.

export const ACTIVITY_KEY = 'activity_log';
const MAX_RECORDS = 500;
/** A tool is only ranked on personal data once it has this many ratings for the chosen feeling. */
export const MIN_RATINGS = 3;
/** Evidence looks at the most recent rated sessions only, so old habits don't dominate forever. */
const EVIDENCE_WINDOW = 10;

export type Tool = 'breathe' | 'grounding' | 'meditation' | 'bubbles' | 'sleep_reset';
export type Feeling = 'stressed' | 'anxious' | 'low_energy' | 'cant_switch_off';
export type Rating = 'worse' | 'same' | 'better' | 'much_better';

export type ActivityRecord = {
  schemaVersion: 1;
  id: string;
  tool: Tool;
  startedAt: string;
  durationSec: number;
  /** True only when the session was finished (timer ended or "Finish" tapped), not when left halfway. */
  completed: boolean;
  feeling?: Feeling[];
  after?: Rating;
  ratedAt?: string;
};

const TOOLS: Tool[] = ['breathe', 'grounding', 'meditation', 'bubbles', 'sleep_reset'];
export const FEELINGS: Feeling[] = ['stressed', 'anxious', 'low_energy', 'cant_switch_off'];
const RATINGS: Rating[] = ['worse', 'same', 'better', 'much_better'];

export const FEELING_LABEL: Record<Feeling, string> = {
  stressed: 'Stressed',
  anxious: 'Anxious',
  low_energy: 'Low energy',
  cant_switch_off: "Can't switch off",
};
const FEELING_PHRASE: Record<Feeling, string> = {
  stressed: 'feeling stressed',
  anxious: 'feeling anxious',
  low_energy: 'low on energy',
  cant_switch_off: 'finding it hard to switch off',
};

export const newActivityId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function isActivityRecord(r: unknown): r is ActivityRecord {
  const x = r as ActivityRecord;
  return !!x && typeof x === 'object' && x.schemaVersion === 1 && typeof x.id === 'string' && x.id.length > 0
    && TOOLS.includes(x.tool) && typeof x.startedAt === 'string' && !Number.isNaN(Date.parse(x.startedAt))
    && typeof x.durationSec === 'number' && typeof x.completed === 'boolean'
    && (x.after === undefined || RATINGS.includes(x.after))
    && (x.feeling === undefined || (Array.isArray(x.feeling) && x.feeling.every((f) => FEELINGS.includes(f))));
}

export async function loadActivities(): Promise<ActivityRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVITY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isActivityRecord) : [];
  } catch {
    return [];
  }
}

/**
 * The single place history is shaped: valid records only, one record per id (the first one wins, so
 * this phone's copy beats an imported duplicate), oldest to newest by start time, newest 500 kept.
 * Used for every write and for backup imports, so the cap and the ordering always hold.
 */
export function normalizeActivities(records: unknown[]): ActivityRecord[] {
  const seen = new Set<string>();
  const unique: ActivityRecord[] = [];
  for (const r of records) {
    if (!isActivityRecord(r) || seen.has(r.id)) continue;
    seen.add(r.id);
    unique.push(r);
  }
  return unique.sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt)).slice(-MAX_RECORDS);
}

// Writes are queued so a "finish" and a "rate" fired close together can't overwrite each other.
let queue: Promise<unknown> = Promise.resolve();
function update(change: (records: ActivityRecord[]) => ActivityRecord[]): Promise<void> {
  const run = queue.then(async () => {
    const next = normalizeActivities(change(await loadActivities()));
    await AsyncStorage.setItem(ACTIVITY_KEY, JSON.stringify(next));
  });
  queue = run.catch(() => undefined);
  return run;
}

export function startActivity(id: string, tool: Tool, feeling?: Feeling): Promise<void> {
  return update((records) => records.some((r) => r.id === id) ? records : [...records, {
    schemaVersion: 1, id, tool, startedAt: new Date().toISOString(), durationSec: 0, completed: false,
    ...(feeling ? { feeling: [feeling] } : {}),
  }]);
}

export function finishActivity(id: string, completed: boolean, durationSec: number): Promise<void> {
  return update((records) => records.map((r) => r.id !== id ? r : {
    ...r,
    // A finished session never becomes "unfinished" later (e.g. leaving the screen after finishing).
    completed: r.completed || completed,
    durationSec: Math.max(r.durationSec, Math.round(durationSec)),
  }));
}

/** One rating per session: rating again replaces it rather than adding a record. */
export function rateActivity(id: string, after: Rating): Promise<void> {
  return update((records) => records.map((r) => r.id === id ? { ...r, after, ratedAt: new Date().toISOString() } : r));
}

// ---------- Suggestions ----------

export type Suggestable = Exclude<Tool, 'sleep_reset'>;
export const TOOL_INFO: Record<Suggestable, { title: string; route: string; icon: string; minutes: number[] }> = {
  breathe: { title: 'Box breathing', route: 'Breathe', icon: 'leaf-outline', minutes: [1, 3, 5] },
  grounding: { title: '5-4-3-2-1 grounding', route: 'Grounding', icon: 'water-outline', minutes: [1, 3, 5] },
  bubbles: { title: 'Bubble release', route: 'BubbleRelease', icon: 'ellipse-outline', minutes: [3, 5] },
  meditation: { title: 'A short meditation', route: 'Meditation', icon: 'headset-outline', minutes: [5] },
};

/** Sensible starting points before there is enough personal data. */
const DEFAULT_ORDER: Record<Feeling, Suggestable[]> = {
  stressed: ['breathe', 'bubbles', 'grounding', 'meditation'],
  anxious: ['grounding', 'breathe', 'bubbles', 'meditation'],
  low_energy: ['bubbles', 'breathe', 'grounding', 'meditation'],
  cant_switch_off: ['meditation', 'breathe', 'bubbles', 'grounding'],
};

const SCORE: Record<Rating, number> = { worse: -1, same: 0, better: 1, much_better: 2 };

export type Evidence = { rated: number; helped: number; worse: number; score: number };

/** Ratings for one tool and feeling, most recent first, capped to the evidence window. */
export function evidenceFor(records: ActivityRecord[], tool: Tool, feeling: Feeling): Evidence {
  const rated = records
    .filter((r) => r.tool === tool && r.completed && r.after && r.feeling?.includes(feeling))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, EVIDENCE_WINDOW);
  const helped = rated.filter((r) => r.after === 'better' || r.after === 'much_better').length;
  const worse = rated.filter((r) => r.after === 'worse').length;
  const score = rated.length ? rated.reduce((t, r) => t + SCORE[r.after!], 0) / rated.length : 0;
  return { rated: rated.length, helped, worse, score };
}

export type Suggestion = {
  tool: Suggestable; title: string; route: string; icon: string; reason: string; personal: boolean;
  /** Length to open the tool with. Differs from the chosen time when suggesting a longer option. */
  minutes: number;
  /** True when this is offered despite the person's own ratings saying it hasn't helped. */
  ratedUnhelpful: boolean;
};

export function suggest(records: ActivityRecord[], feeling: Feeling, minutes: number): { primary: Suggestion; alternative: Suggestion | null } {
  const fits = (t: Suggestable) => TOOL_INFO[t].minutes.includes(minutes) || (minutes >= 5 && TOOL_INFO[t].minutes.some((m) => m <= minutes));
  const all = DEFAULT_ORDER[feeling];
  const evidence = new Map(all.map((tool) => [tool, evidenceFor(records, tool, feeling)]));
  const enough = (t: Suggestable) => evidence.get(t)!.rated >= MIN_RATINGS;
  const helpful = (t: Suggestable) => enough(t) && evidence.get(t)!.score > 0;
  const unhelpful = (t: Suggestable) => enough(t) && evidence.get(t)!.score <= 0;
  // Ranking: tools that have helped this person (best first), then untried/undecided defaults, then rated-unhelpful.
  const rank = (tools: Suggestable[]) => [
    ...tools.filter(helpful).sort((a, b) => evidence.get(b)!.score - evidence.get(a)!.score || evidence.get(b)!.rated - evidence.get(a)!.rated),
    ...tools.filter((t) => !enough(t)),
    ...tools.filter(unhelpful),
  ];
  const fitting = rank(all.filter(fits));
  const lengthFor = (t: Suggestable) => (fits(t) ? minutes : TOOL_INFO[t].minutes.find((m) => m > minutes) ?? TOOL_INFO[t].minutes[0]);

  const primaryTool = fitting[0] ?? rank(all)[0];
  // Alternative: the next fitting tool that hasn't been rated unhelpful; otherwise the best option at a longer length.
  const altTool = fitting.find((t) => t !== primaryTool && !unhelpful(t))
    ?? rank(all.filter((t) => !fits(t) && !unhelpful(t)))[0]
    ?? null;
  const lengthPhrase = `${minutes} minute${minutes === 1 ? '' : 's'}`;

  const make = (tool: Suggestable): Suggestion => {
    const ev = evidence.get(tool)!;
    const info = TOOL_INFO[tool];
    const len = lengthFor(tool);
    let reason: string;
    if (helpful(tool)) reason = `Early observation: you felt better after this in ${ev.helped} of your last ${ev.rated} sessions when ${FEELING_PHRASE[feeling]}.`;
    else if (unhelpful(tool)) {
      // Only reached when nothing that fits the chosen time is left that hasn't been rated unhelpful.
      reason = `None of the ${lengthPhrase} options has helped you recently when ${FEELING_PHRASE[feeling]} (this one: not better in ${ev.rated - ev.helped} of your last ${ev.rated}).`
        + (altTool ? ' With a bit more time, the option below may suit you better.' : ' You could still try it, or pick a different feeling or length.');
    }
    else reason = `A good place to start when you're ${FEELING_PHRASE[feeling]}.`;
    return { tool, title: info.title, route: info.route, icon: info.icon, reason, personal: helpful(tool), minutes: len, ratedUnhelpful: unhelpful(tool) };
  };

  return { primary: make(primaryTool), alternative: altTool ? make(altTool) : null };
}
