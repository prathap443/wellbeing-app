import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CategoryValueSleepAnalysis,
  isHealthDataAvailable,
  queryCategorySamples,
  queryStatisticsCollectionForQuantity,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit';

// Apple Health (read-only). Everything read here stays on this device: it is shown in the app
// and never sent to our server, the AI coach or anyone else (App Store guideline 5.1.3).

const CONNECTED_KEY = 'health_connected';
const READ_TYPES = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierDistanceWalkingRunning',
  'HKCategoryTypeIdentifierSleepAnalysis',
] as const;

export type HealthDay = {
  /** Local date this value belongs to; for sleep, the morning you woke up. */
  date: Date;
  steps: number | null;
  distanceKm: number | null;
  sleepMinutes: number | null;
  /** True when only "in bed" time was recorded (e.g. iPhone sleep schedule without a watch). */
  sleepIsInBed: boolean;
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const healthDayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Apple Health exists only on iPhone (not iPad without Health, web or Android). */
export function healthAvailable(): boolean {
  if (Platform.OS !== 'ios') return false;
  try { return isHealthDataAvailable(); } catch { return false; }
}

export async function isHealthConnected(): Promise<boolean> {
  if (!healthAvailable()) return false;
  return (await AsyncStorage.getItem(CONNECTED_KEY).catch(() => null)) === 'true';
}

/**
 * Shows Apple's permission sheet the first time; afterwards it returns immediately.
 * iOS never reveals whether the user allowed reading, so "connected" only means we asked.
 */
export async function connectHealth(): Promise<boolean> {
  if (!healthAvailable()) return false;
  await requestAuthorization({ toRead: READ_TYPES });
  await AsyncStorage.setItem(CONNECTED_KEY, 'true');
  return true;
}

/** Stops reading. Permissions themselves are managed by the user in the Health app. */
export async function disconnectHealth(): Promise<void> {
  await AsyncStorage.removeItem(CONNECTED_KEY);
}

const ASLEEP = new Set<number>([
  CategoryValueSleepAnalysis.asleepUnspecified,
  CategoryValueSleepAnalysis.asleepCore,
  CategoryValueSleepAnalysis.asleepDeep,
  CategoryValueSleepAnalysis.asleepREM,
]);

/** Total minutes covered by a set of intervals, counting overlaps once (watch + phone can both record). */
function unionMinutes(intervals: [number, number][]): number {
  const sorted = intervals.filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0]);
  let total = 0;
  let curStart = -1;
  let curEnd = -1;
  for (const [s, e] of sorted) {
    if (s > curEnd) {
      if (curEnd > curStart) total += curEnd - curStart;
      curStart = s; curEnd = e;
    } else if (e > curEnd) {
      curEnd = e;
    }
  }
  if (curEnd > curStart) total += curEnd - curStart;
  return Math.round(total / 60000);
}

/**
 * Daily steps, walking distance and sleep for the last `days` days (today included).
 * Never throws: missing permission or no data simply gives nulls.
 */
export async function readHealthDays(days = 14): Promise<HealthDay[]> {
  const today = startOfDay(new Date());
  const first = new Date(today); first.setDate(first.getDate() - (days - 1));
  const now = new Date();
  // Make sure permission was requested this session; HealthKit crashes on queries for types never requested.
  await requestAuthorization({ toRead: READ_TYPES });

  const result = new Map<string, HealthDay>();
  for (let i = 0; i < days; i++) {
    const d = new Date(first); d.setDate(first.getDate() + i);
    result.set(healthDayKey(d), { date: d, steps: null, distanceKm: null, sleepMinutes: null, sleepIsInBed: false });
  }
  const dateFilter = { date: { startDate: first, endDate: now } };

  const [steps, distance, sleep] = await Promise.all([
    queryStatisticsCollectionForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], first, { day: 1 }, { filter: dateFilter, unit: 'count' }).catch(() => []),
    queryStatisticsCollectionForQuantity('HKQuantityTypeIdentifierDistanceWalkingRunning', ['cumulativeSum'], first, { day: 1 }, { filter: dateFilter, unit: 'm' }).catch(() => []),
    // Start the evening before the first day, so the first night is complete.
    queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
      limit: 0,
      filter: { date: { startDate: new Date(first.getTime() - 12 * 3600_000), endDate: now } },
    }).catch(() => []),
  ]);

  for (const s of steps) {
    const day = s.startDate ? result.get(healthDayKey(s.startDate)) : undefined;
    const value = s.sumQuantity?.quantity;
    if (day && typeof value === 'number' && value > 0) day.steps = Math.round(value);
  }
  for (const s of distance) {
    const day = s.startDate ? result.get(healthDayKey(s.startDate)) : undefined;
    const value = s.sumQuantity?.quantity;
    if (day && typeof value === 'number' && value > 0) day.distanceKm = Math.round(value / 100) / 10;
  }

  // Sleep belongs to the day you woke up. Prefer "asleep" stages; fall back to "in bed" when that's all there is.
  const asleep = new Map<string, [number, number][]>();
  const inBed = new Map<string, [number, number][]>();
  for (const sample of sleep) {
    const start = new Date(sample.startDate).getTime();
    const end = new Date(sample.endDate).getTime();
    const key = healthDayKey(new Date(sample.endDate));
    if (!result.has(key)) continue;
    const bucket = ASLEEP.has(sample.value as number) ? asleep : sample.value === CategoryValueSleepAnalysis.inBed ? inBed : null;
    if (!bucket) continue;
    bucket.set(key, [...(bucket.get(key) ?? []), [start, end]]);
  }
  for (const [key, day] of result) {
    const a = asleep.get(key);
    const b = inBed.get(key);
    if (a?.length) { day.sleepMinutes = unionMinutes(a); }
    else if (b?.length) { day.sleepMinutes = unionMinutes(b); day.sleepIsInBed = true; }
    if (day.sleepMinutes === 0) day.sleepMinutes = null;
  }
  return [...result.values()];
}

export const formatSleep = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
export const formatSteps = (steps: number) => steps.toLocaleString();
export { unionMinutes as _unionMinutesForTests };
