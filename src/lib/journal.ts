import AsyncStorage from '@react-native-async-storage/async-storage';

export const JOURNAL_KEY = 'journal_entries';
/** Unfinished reflection, autosaved while writing. Not part of backups; removed by Clear All Data. */
export const JOURNAL_DRAFT_KEY = 'journal_draft';
/** Per-field input limit. The backup importer accepts far more, so anything typed here always restores. */
export const JOURNAL_FIELD_MAX = 5000;

export type JournalEntry = {
  id?: string;
  createdAt?: string;
  date: string;
  text?: string;
  situation?: string;
  feelings?: string[];
  thought?: string;
  perspective?: string;
  nextStep?: string;
  /** 'voice' when the reflection was spoken (the words only; audio is never kept). */
  source?: 'voice';
  /** Answer to "Did it happen?" for the next step, asked once on a later visit. */
  nextStepStatus?: 'done' | 'not_yet' | 'dismissed';
  nextStepCheckedAt?: string;
  /** Set when the step was made smaller: the step's own clock restarts from here. */
  nextStepUpdatedAt?: string;
  /** "Not today" on Home: hidden for this local day (YYYY-MM-DD). */
  nextStepSnoozedOn?: string;
};
/** Feeling chips shared by the written and spoken journal. */
export const JOURNAL_FEELINGS = ['Calm', 'Hopeful', 'Stressed', 'Low', 'Anxious', 'Frustrated'];
/** Journal feeling -> the feeling used by "What helps me?" and the exercises, where one fits. */
export const TOOL_FEELING: Record<string, 'stressed' | 'anxious' | 'low_energy'> = { Stressed: 'stressed', Frustrated: 'stressed', Anxious: 'anxious', Low: 'low_energy' };

export type JournalDraft = { situation: string; thought: string; perspective: string; nextStep: string; feelings: string[] };
export const EMPTY_DRAFT: JournalDraft = { situation: '', thought: '', perspective: '', nextStep: '', feelings: [] };

const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); };
/** Stable id. Older entries have none, so one is derived from their content (no rewrite needed). */
export const entryId = (e: JournalEntry) => e.id ?? `j-${hash(JSON.stringify(e))}`;
export const newEntryId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
export const entryTitle = (e: JournalEntry) => (e.situation || e.thought || e.text || '').trim() || 'Reflection';

/**
 * Reads saved reflections. `ok: false` means they exist but couldn't be read, which is different from
 * "none yet". Callers must not save while ok is false, or they would overwrite what's there.
 */
export async function loadJournal(): Promise<{ ok: true; entries: JournalEntry[] } | { ok: false }> {
  try {
    const raw = await AsyncStorage.getItem(JOURNAL_KEY);
    if (!raw) return { ok: true, entries: [] };
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? { ok: true, entries: parsed.filter((e) => e && typeof e === 'object') } : { ok: false };
  } catch {
    return { ok: false };
  }
}

/** Saves the full list. Never trims older reflections. Throws if storage fails. */
export async function saveJournal(entries: JournalEntry[]): Promise<void> {
  await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
}

/** Kept aside if a stored draft can't be read, so it is never silently overwritten. Cleared by Clear All Data. */
export const JOURNAL_DRAFT_UNREADABLE_KEY = 'journal_draft_unreadable';

export const sameDraft = (a: JournalDraft, b: JournalDraft) =>
  a.situation === b.situation && a.thought === b.thought && a.perspective === b.perspective && a.nextStep === b.nextStep
  && a.feelings.length === b.feelings.length && a.feelings.every((f, i) => f === b.feelings[i]);

/**
 * After a successful save: clear the draft only if it is still exactly what was saved. If the person
 * kept typing while the save was in progress, their newer text is kept.
 */
export const draftAfterSave = (current: JournalDraft, saved: JournalDraft): { draft: JournalDraft; newerKept: boolean } =>
  sameDraft(current, saved) ? { draft: EMPTY_DRAFT, newerKept: false } : { draft: current, newerKept: true };

// ---------- Next steps: what happens to a reflection after it is saved ----------
const DAY = 86_400_000;
/** When the step was set (or last made smaller). */
const stepTime = (e: JournalEntry) => Date.parse(e.nextStepUpdatedAt ?? e.createdAt ?? '');
const hasStep = (e: JournalEntry) => !!e.nextStep?.trim() && !Number.isNaN(stepTime(e));
export const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The newest step overall. Only this one is ever surfaced, so older steps never pile up into a to-do list. */
const newestStep = (entries: JournalEntry[]) =>
  entries.filter(hasStep).reduce<JournalEntry | null>((best, e) => (!best || stepTime(e) > stepTime(best) ? e : best), null);

/** Journal asks "Did it happen?" from 4 hours to 14 days after the step was set, once. */
export function pendingNextStep(entries: JournalEntry[], now = Date.now()): JournalEntry | null {
  const e = newestStep(entries);
  if (!e || e.nextStepStatus) return null;
  const age = now - stepTime(e);
  return age >= 4 * 3600_000 && age <= 14 * DAY ? e : null;
}

/** Home shows the step for 3 days while it is still open, unless hidden for today. */
export function openNextStep(entries: JournalEntry[], now = new Date()): JournalEntry | null {
  const e = newestStep(entries);
  if (!e || (e.nextStepStatus && e.nextStepStatus !== 'not_yet')) return null;
  if (e.nextStepSnoozedOn === localDay(now)) return null;
  const age = now.getTime() - stepTime(e);
  return age >= 0 && age <= 3 * DAY ? e : null;
}

export type StepAnswer = 'done' | 'not_yet' | 'dismissed' | 'snooze' | { smaller: string };
/** Returns a new list with the answer applied to that one reflection (nothing else changes). */
export function withNextStepAnswer(entries: JournalEntry[], id: string, answer: StepAnswer, now = new Date()): JournalEntry[] {
  return entries.map((e) => {
    if (entryId(e) !== id) return e;
    if (answer === 'snooze') return { ...e, nextStepSnoozedOn: localDay(now) };
    if (typeof answer === 'object') {
      const { nextStepStatus: _s, nextStepCheckedAt: _c, nextStepSnoozedOn: _z, ...rest } = e;
      return { ...rest, nextStep: answer.smaller.trim(), nextStepUpdatedAt: now.toISOString() };
    }
    return { ...e, nextStepStatus: answer, nextStepCheckedAt: now.toISOString() };
  });
}

/** Reads the latest reflections, applies the answer and saves. Throws (changing nothing) if they can't be read. */
export async function answerNextStep(id: string, answer: StepAnswer): Promise<JournalEntry[]> {
  const result = await loadJournal();
  if (!result.ok) throw new Error('journal_unreadable');
  const next = withNextStepAnswer(result.entries, id, answer);
  await saveJournal(next);
  return next;
}

// ---------- "Your own words" ----------
/** The most recent kinder perspective written when feeling one of these, to show back when the feeling returns. */
export function ownWords(entries: JournalEntry[], feelings: string[]): { feeling: string; text: string; date: string } | null {
  if (!feelings.length) return null;
  const newest = [...entries].sort((a, b) => (Date.parse(b.createdAt ?? '') || 0) - (Date.parse(a.createdAt ?? '') || 0));
  for (const e of newest) {
    const text = e.perspective?.trim();
    const feeling = e.feelings?.find((f) => feelings.includes(f));
    if (text && feeling) return { feeling, text, date: e.date };
  }
  return null;
}
