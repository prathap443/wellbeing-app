import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DATA_KEYS } from './storage';
import { isActivityRecord } from './activity';
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
const LIST_KEYS = new Set(['mood_entries', 'daily_check_ins', 'journal_entries', 'mental_state_plans', 'meditation_favourites', 'trusted_contacts', 'activity_log']);
const OBJECT_KEYS = new Set(['habit_records', 'therapy_companion_plan', 'coach_profile']);

type Data = Record<string, unknown>;
export type ParsedBackup = { exportedAt: string; data: Data; summary: { label: string; count: number }[] };
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
  for (const key of BACKUP_KEYS) {
    if (!(key in json.data)) continue;
    let value = (json.data as Data)[key];
    if (LIST_KEYS.has(key)) {
      if (!Array.isArray(value)) continue;
      value = key === 'activity_log' ? value.filter(isActivityRecord)
        : key === 'meditation_favourites' ? value.filter((v) => typeof v === 'string')
        : value.filter(isPlainObject);
    } else if (OBJECT_KEYS.has(key)) {
      if (!isPlainObject(value)) continue;
    } else if (value === null || (typeof value === 'object' && !isPlainObject(value) && !Array.isArray(value))) continue;
    data[key] = value;
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
  return { exportedAt, data, summary };
}

/**
 * merge: keeps everything on this phone and adds what's missing from the backup (records already
 * present are not duplicated). replace: this phone's data is replaced by the backup's.
 */
export async function applyBackup(backup: ParsedBackup, mode: 'merge' | 'replace'): Promise<void> {
  if (mode === 'replace') {
    await AsyncStorage.multiRemove(BACKUP_KEYS);
    await AsyncStorage.multiSet(Object.entries(backup.data).map(([k, v]) => [k, toStored(v)] as [string, string]));
    return;
  }
  const current = new Map((await AsyncStorage.multiGet(Object.keys(backup.data))).map(([k, raw]) => [k, fromStored(raw)]));
  const writes: [string, string][] = [];
  for (const [key, incoming] of Object.entries(backup.data)) {
    const local = current.get(key);
    let merged: unknown;
    if (local == null) merged = incoming;
    else if (Array.isArray(local) && Array.isArray(incoming)) {
      const keyOf = key === 'activity_log' ? (r: any) => r.id : (r: unknown) => JSON.stringify(r);
      const seen = new Set(local.map(keyOf));
      merged = [...local, ...incoming.filter((r) => !seen.has(keyOf(r)))];
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
  if (writes.length) await AsyncStorage.multiSet(writes);
}
