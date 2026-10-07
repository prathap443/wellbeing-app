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
};
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
