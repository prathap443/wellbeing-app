import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DATA_KEYS, RECOVERY_KEY } from './storage';
import { normalizeActivities } from './activity';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

// Backups are plain JSON files the user keeps. We never receive them.
// Format: { app: "Wellbeing", backupVersion: 1, exportedAt, data: { <storage key>: <value> } }

export const BACKUP_VERSION = 1;
const MAX_BYTES = 5 * 1024 * 1024;
/** Daily coach state and the one-time account prompt are not worth restoring. Settings are excluded too:
 *  reminders and app lock must be switched on on the device itself. */
export const BACKUP_KEYS: string[] = DATA_KEYS.filter((k) => k !== 'coach_session' && k !== 'account_prompt_seen');

type Data = Record<string, unknown>;
export type ParsedBackup = { exportedAt: string; data: Data; summary: { label: string; count: number }[]; skipped: number };
export type RestoreResult = { ok: true } | { ok: false; rolledBack: boolean };
export class BackupError extends Error {}

const isPlainObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const toStored = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v));
const fromStored = (raw: string | null): unknown => { if (raw == null) return null; try { return JSON.parse(raw); } catch { return raw; } };

export async function buildBackup(now = new Date()): Promise<string> {
  const pairs = await AsyncStorage.multiGet(BACKUP_KEYS);
  const data: Data = {};
  for (const [key, raw] of pairs) if (raw != null) data[key] = fromStored(raw);
  return JSON.stringify({ app: 'Wellbeing', backupVersion: BACKUP_VERSION, exportedAt: now.toISOString(), data }, null, 2);
}

export const backupFileName = (now = new Date()) =>
  `wellbeing-backup-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.json`;

/** Writes the backup to a real .json file and opens the share sheet (Save to Files, AirDrop, email…). */
export async function exportBackup(): Promise<void> {
  const json = await buildBackup();
  const name = backupFileName();
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  if (!(await Sharing.isAvailableAsync())) throw new BackupError('Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save your Wellbeing backup' });
}

/** Lets the user choose a backup file and returns its text, or null if they cancelled. */
export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', 'public.json'], copyToCacheDirectory: true, multiple: false });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  if (asset.size && asset.size > MAX_BYTES) throw new BackupError('That file is too large to be a Wellbeing backup.');
  if (Platform.OS === 'web') return asset.file ? asset.file.text() : (await fetch(asset.uri)).text();
  return new File(asset.uri).text();
}

// ---------- Validation: only accept records shaped the way each screen saves them ----------
const MOODS = ['great', 'good', 'okay', 'bad', 'very_bad'];
const HABITS = ['sleep', 'water', 'movement', 'meditation', 'connection'];
const MEDITATIONS = ['arrive', 'release', 'sleep', 'kindness'];
const str = (v: unknown, max = 5000) => typeof v === 'string' && v.length <= max;
const nonEmpty = (v: unknown, max = 5000) => str(v, max) && (v as string).trim().length > 0;
const optStr = (v: unknown, max = 5000) => v === undefined || str(v, max);
const int = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const dateStr = (v: unknown) => nonEmpty(v, 40);
const isoOpt = (v: unknown) => v === undefined || (str(v, 40) && !Number.isNaN(Date.parse(v as string)));
const strArr = (v: unknown, allowed?: string[]) => Array.isArray(v) && v.every((x) => str(x, 200) && (!allowed || allowed.includes(x)));

type Rule = (v: unknown) => { value?: unknown; skipped: number };
/** A list: keeps the valid records and counts the rest as skipped. */
const list = (ok: (r: any) => boolean, max = 5000): Rule => (v) => {
  if (!Array.isArray(v)) return { skipped: 1 };
  const kept = v.filter(ok).slice(-max);
  return { value: kept, skipped: v.length - kept.length };
};
const whole = (ok: (v: any) => boolean): Rule => (v) => (ok(v) ? { value: v, skipped: 0 } : { skipped: 1 });

const RULES: Record<string, Rule> = {
  mood_entries: list((r) => isPlainObject(r) && MOODS.includes(r.mood as string) && dateStr(r.date) && optStr(r.note, 2000) && isoOpt(r.timestamp)),
  daily_check_ins: list((r) => isPlainObject(r) && int(r.sleep, 1, 5) && int(r.energy, 1, 5) && int(r.stress, 1, 5) && dateStr(r.date) && isoOpt(r.createdAt)),
  journal_entries: list((r) => isPlainObject(r) && dateStr(r.date)
    && ['text', 'situation', 'thought', 'perspective', 'nextStep'].every((k) => optStr(r[k]))
    && (r.feelings === undefined || strArr(r.feelings))
    && ['text', 'situation', 'thought', 'perspective', 'nextStep'].some((k) => nonEmpty(r[k]))),
  // updatedAt: ISO from v1.2 on; older plans saved a time only ("12:35"), which is still valid.
  mental_state_plans: list((r) => isPlainObject(r) && dateStr(r.date) && int(r.capacity, 1, 5) && (r.updatedAt === undefined || nonEmpty(r.updatedAt, 40))
    && Array.isArray(r.tasks) && (r.tasks as any[]).every((t) => isPlainObject(t) && nonEmpty(t.id, 100) && nonEmpty(t.title, 300) && int(t.effort, 1, 3) && typeof t.done === 'boolean'), 60),
  trusted_contacts: list((r) => nonEmpty(r, 200) || (isPlainObject(r) && nonEmpty(r.name, 200) && optStr(r.phone, 40)), 50),
  meditation_favourites: list((r) => MEDITATIONS.includes(r), 10),
  activity_log: (v) => {
    if (!Array.isArray(v)) return { skipped: 1 };
    const kept = normalizeActivities(v);
    return { value: kept, skipped: v.length - kept.length };
  },
  habit_records: (v) => {
    if (!isPlainObject(v)) return { skipped: 1 };
    const out: Record<string, string[]> = {};
    let skipped = 0;
    for (const [day, ids] of Object.entries(v)) {
      if (nonEmpty(day, 40) && strArr(ids, HABITS)) out[day] = ids as string[]; else skipped++;
    }
    return { value: out, skipped };
  },
  weekly_habit_goal: whole((v) => int(v, 1, 7)),
  meditation_completed: whole((v) => int(v, 0, 1_000_000)),
  sleep_reset_habits: whole((v) => isPlainObject(v) && nonEmpty(v.night, 20) && strArr(v.done)),
  therapy_companion_plan: whole((v) => isPlainObject(v) && optStr(v.topic) && optStr(v.questions)
    && (v.actions === undefined || (Array.isArray(v.actions) && (v.actions as any[]).every((a) => isPlainObject(a) && nonEmpty(a.id, 100) && nonEmpty(a.text, 300) && typeof a.done === 'boolean')))),
  coach_profile: whole((v) => isPlainObject(v) && Object.values(v).every((x) => str(x, 200) || strArr(x))),
  coach_consent: whole((v) => v === true || v === 'true'),
};

/** Validates a backup and summarises what it contains. Unknown keys and malformed records are dropped. */
export function parseBackup(text: string): ParsedBackup {
  if (text.length > MAX_BYTES) throw new BackupError('That file is too large to be a Wellbeing backup.');
  let json: unknown;
  try { json = JSON.parse(text); } catch { throw new BackupError('This file could not be read. Choose a Wellbeing backup (.json) file.'); }
  if (!isPlainObject(json) || json.app !== 'Wellbeing' || !isPlainObject(json.data)) throw new BackupError('This file is not a Wellbeing backup.');
  // Version 1 also accepts files from the older "Export Data" share text, which had no version number.
  const version = json.backupVersion ?? 1;
  if (version !== 1) throw new BackupError('This backup was made by a newer version of Wellbeing. Update the app, then try again.');

  const data: Data = {};
  let skipped = 0;
  for (const key of BACKUP_KEYS) {
    if (!(key in json.data)) continue;
    const rule = RULES[key];
    if (!rule) continue;
    const result = rule((json.data as Data)[key]);
    skipped += result.skipped;
    if (result.value !== undefined) data[key] = result.value;
  }
  const len = (k: string) => (Array.isArray(data[k]) ? (data[k] as unknown[]).length : 0);
  const summary = [
    { label: 'Mood entries', count: len('mood_entries') },
    { label: 'Check-ins', count: len('daily_check_ins') },
    { label: 'Journal reflections', count: len('journal_entries') },
    { label: 'Activity sessions', count: len('activity_log') },
    { label: 'Days of habits', count: isPlainObject(data.habit_records) ? Object.keys(data.habit_records).length : 0 },
    { label: 'Plans', count: len('mental_state_plans') },
    { label: 'Trusted contacts', count: len('trusted_contacts') },
  ].filter((s) => s.count > 0);
  if (!Object.keys(data).length) throw new BackupError('This backup does not contain any data to restore.');
  const exportedAt = typeof json.exportedAt === 'string' && !Number.isNaN(Date.parse(json.exportedAt)) ? json.exportedAt : '';
  return { exportedAt, data, summary, skipped };
}

// ---------- Crash-safe writes ----------
// A recovery copy of the current data is saved BEFORE anything changes, and only deleted once the
// restore has fully succeeded or been fully undone. Nothing is ever bulk-deleted: undoing puts the
// original values back and removes only keys this restore created. If undoing also fails, the copy
// stays and recoverInterruptedRestore() finishes the job the next time the app opens.
type Recovery = { v: 1; startedAt: string; snapshot: [string, string | null][] };

/** Puts the data back exactly as it was in the recovery copy. Throws if storage fails. */
async function undo(snapshot: [string, string | null][]): Promise<void> {
  const original = snapshot.filter(([, v]) => v != null) as [string, string][];
  const created = snapshot.filter(([, v]) => v == null).map(([k]) => k);
  if (original.length) await AsyncStorage.multiSet(original); // original values first...
  if (created.length) await AsyncStorage.multiRemove(created); // ...then drop only what didn't exist before
}

async function writeSafely(sets: [string, string][], removes: string[]): Promise<RestoreResult> {
  const snapshot = await AsyncStorage.multiGet(BACKUP_KEYS);
  const recovery: Recovery = { v: 1, startedAt: new Date().toISOString(), snapshot: snapshot.map(([k, v]) => [k, v]) };
  try {
    await AsyncStorage.setItem(RECOVERY_KEY, JSON.stringify(recovery));
  } catch {
    return { ok: false, rolledBack: true }; // couldn't save a recovery copy, so nothing was changed
  }
  try {
    if (sets.length) await AsyncStorage.multiSet(sets);
    if (removes.length) await AsyncStorage.multiRemove(removes);
  } catch {
    try {
      await undo(recovery.snapshot);
      await AsyncStorage.removeItem(RECOVERY_KEY).catch(() => undefined);
      return { ok: false, rolledBack: true };
    } catch {
      return { ok: false, rolledBack: false }; // the recovery copy is kept; the next app launch finishes the undo
    }
  }
  // Success. If deleting the copy fails, the next launch would undo this restore: the person keeps their
  // original data (and their backup file), which is the safe direction.
  await AsyncStorage.removeItem(RECOVERY_KEY).catch(() => undefined);
  return { ok: true };
}

/** Call at app start: finishes undoing a restore that was interrupted. Safe to call any time. */
export async function recoverInterruptedRestore(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(RECOVERY_KEY);
    if (!raw) return false;
    const recovery = JSON.parse(raw) as Recovery;
    if (recovery?.v !== 1 || !Array.isArray(recovery.snapshot)) { await AsyncStorage.removeItem(RECOVERY_KEY); return false; }
    await undo(recovery.snapshot.filter(([k]) => BACKUP_KEYS.includes(k)));
    await AsyncStorage.removeItem(RECOVERY_KEY);
    return true;
  } catch {
    return false; // still stored; try again next launch
  }
}

/**
 * merge: keeps everything on this phone and adds what's missing from the backup (records already
 * present are not duplicated). replace: this phone's data is replaced by the backup's.
 * Either way, a failure rolls back to the data as it was before, and the result says what happened.
 */
export async function applyBackup(backup: ParsedBackup, mode: 'merge' | 'replace'): Promise<RestoreResult> {
  const finalValue = (key: string, v: unknown) => (key === 'activity_log' && Array.isArray(v) ? normalizeActivities(v) : v);
  if (mode === 'replace') {
    const sets = Object.entries(backup.data).map(([k, v]) => [k, toStored(finalValue(k, v))] as [string, string]);
    return writeSafely(sets, BACKUP_KEYS.filter((k) => !(k in backup.data)));
  }
  const current = new Map((await AsyncStorage.multiGet(Object.keys(backup.data))).map(([k, raw]) => [k, fromStored(raw)]));
  const writes: [string, string][] = [];
  for (const [key, incoming] of Object.entries(backup.data)) {
    const local = current.get(key);
    let merged: unknown;
    if (local == null) merged = incoming;
    else if (key === 'activity_log' && Array.isArray(local) && Array.isArray(incoming)) {
      merged = normalizeActivities([...local, ...incoming]); // de-duplicate by id (this phone wins), sort, keep newest 500
    } else if (Array.isArray(local) && Array.isArray(incoming)) {
      const seen = new Set(local.map((r) => JSON.stringify(r)));
      merged = [...local, ...incoming.filter((r) => !seen.has(JSON.stringify(r)))];
    } else if (key === 'habit_records' && isPlainObject(local) && isPlainObject(incoming)) {
      const out: Record<string, unknown> = { ...local };
      for (const [day, ids] of Object.entries(incoming)) {
        const mine = Array.isArray(out[day]) ? (out[day] as unknown[]) : [];
        out[day] = Array.from(new Set([...mine, ...(Array.isArray(ids) ? ids : [])]));
      }
      merged = out;
    } else if (key === 'meditation_completed') {
      merged = Math.max(Number(local) || 0, Number(incoming) || 0);
    } else {
      merged = local; // current plans, profile and settings on this phone win
    }
    writes.push([key, toStored(merged)]);
  }
  return writeSafely(writes, []);
}
