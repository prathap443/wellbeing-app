import AsyncStorage from '@react-native-async-storage/async-storage';
import { dayKey, lastDays } from './habits';

// Energy planner: match today's list to the energy you actually have.
// Energy 1-5 gives room for 3-15 "bars"; tasks cost 1 (light), 2 (medium) or 3 (heavy) bars.
// Saved automatically. Unfinished tasks are offered again the next day (Keep / Let go), never silently.

export const PLANS_KEY = 'mental_state_plans';
export const MAX_PLANS = 60;
export const ENERGY_LABELS = ['Very low', 'Low', 'Steady', 'Good', 'Plenty'];

export type Task = {
  id: string; title: string; effort: 1 | 2 | 3; done: boolean;
  /** Set on a task left unfinished on an earlier day once the person has decided: kept for today, or let go. */
  carried?: 'kept' | 'let_go';
  /** The day it was carried over from, shown as a small note. */
  from?: string;
  /** Added from a journal next step. */
  fromJournal?: boolean;
};
export type Plan = { date: string; capacity: number; tasks: Task[]; updatedAt: string; /** false = energy not chosen yet (e.g. a task moved to tomorrow). */ capacitySet?: boolean };

export const room = (capacity: number) => capacity * 3;
/** Everything planned for the day, done or not: the day's energy is spent either way. */
export const used = (tasks: Task[]) => tasks.reduce((n, t) => n + t.effort, 0);
export const newTaskId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const tomorrowOf = (day: string) => { const [y, m, d] = day.split('-').map(Number); return dayKey(new Date(y, m - 1, d + 1)); };

/** The heaviest unfinished task: the one to suggest moving when the plan is over budget. */
export const heaviestOpen = (tasks: Task[]) => tasks.filter((t) => !t.done).reduce<Task | null>((b, t) => (!b || t.effort > b.effort ? t : b), null);

/** Old plans used region-dependent dates; convert them, and merge any duplicate days (latest edit wins). */
export function normalisePlans(raw: unknown, now = new Date(), toLocal = (d: Date) => d.toLocaleDateString()): { plans: Plan[]; changed: boolean } {
  if (!Array.isArray(raw)) return { plans: [], changed: false };
  const lookup = new Map<string, string>();
  for (const d of lastDays(731, now)) lookup.set(toLocal(d), dayKey(d));
  const byDay = new Map<string, Plan>();
  let changed = false;
  for (const p of raw) {
    if (!p || typeof p !== 'object' || typeof p.date !== 'string' || !Array.isArray(p.tasks)) { changed = true; continue; }
    const date = /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date : lookup.get(p.date) ?? p.date;
    if (date !== p.date) changed = true;
    const tasks: Task[] = p.tasks.filter((t: any) => t && typeof t.id === 'string' && typeof t.title === 'string' && t.title.trim())
      .map((t: any) => ({ ...t, effort: [1, 2, 3].includes(t.effort) ? t.effort : 1, done: !!t.done }));
    const plan: Plan = { date, capacity: Number.isInteger(p.capacity) && p.capacity >= 1 && p.capacity <= 5 ? p.capacity : 3, tasks, updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : '', capacitySet: p.capacitySet !== false };
    const prev = byDay.get(date);
    if (prev) changed = true;
    if (!prev || plan.updatedAt > prev.updatedAt) byDay.set(date, plan);
  }
  const plans = [...byDay.values()].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, MAX_PLANS);
  return { plans, changed };
}

/** Unfinished tasks from the most recent earlier day (within a week) that haven't been decided on yet. */
export function carryOver(plans: Plan[], today: string): { plan: Plan; tasks: Task[] } | null {
  const weekAgo = lastDays(8, new Date(`${today}T12:00:00`))[0];
  const earlier = plans.filter((p) => p.date < today && p.date >= dayKey(weekAgo)).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (!earlier) return null;
  const tasks = earlier.tasks.filter((t) => !t.done && !t.carried);
  return tasks.length ? { plan: earlier, tasks } : null;
}

export function upsert(plans: Plan[], plan: Plan): Plan[] {
  return [plan, ...plans.filter((p) => p.date !== plan.date)].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, MAX_PLANS);
}

/** Keep (copied into today) or let go: the earlier task is marked so it's never offered again. */
export function decideCarry(plans: Plan[], today: Plan, fromDate: string, taskIds: string[], decision: 'kept' | 'let_go', now = new Date()): { plans: Plan[]; today: Plan } {
  const src = plans.find((p) => p.date === fromDate);
  if (!src) return { plans, today };
  const moving = src.tasks.filter((t) => taskIds.includes(t.id) && !t.done && !t.carried);
  const updatedSrc: Plan = { ...src, tasks: src.tasks.map((t) => (taskIds.includes(t.id) && !t.done ? { ...t, carried: decision } : t)), updatedAt: now.toISOString() };
  const nextToday: Plan = decision === 'kept'
    ? { ...today, tasks: [...today.tasks, ...moving.map((t) => ({ id: newTaskId(), title: t.title, effort: t.effort, done: false, from: fromDate }))], updatedAt: now.toISOString() }
    : today;
  return { plans: upsert(upsert(plans, updatedSrc), nextToday), today: nextToday };
}

/** Moves a task to tomorrow's plan (created if needed, energy left for that day to set). */
export function moveToTomorrow(plans: Plan[], today: Plan, taskId: string, now = new Date()): { plans: Plan[]; today: Plan } {
  const task = today.tasks.find((t) => t.id === taskId);
  if (!task) return { plans, today };
  const tDate = tomorrowOf(today.date);
  const existing = plans.find((p) => p.date === tDate);
  const tomorrow: Plan = existing
    ? { ...existing, tasks: [...existing.tasks, { ...task, id: newTaskId(), done: false, from: today.date }], updatedAt: now.toISOString() }
    : { date: tDate, capacity: 3, capacitySet: false, tasks: [{ ...task, id: newTaskId(), done: false, from: today.date }], updatedAt: now.toISOString() };
  const nextToday: Plan = { ...today, tasks: today.tasks.filter((t) => t.id !== taskId), updatedAt: now.toISOString() };
  return { plans: upsert(upsert(plans, tomorrow), nextToday), today: nextToday };
}

/** A kind summary once something is done (never mentions what wasn't). */
export function dayMessage(tasks: Task[], capacity: number, hour: number): string | null {
  const done = tasks.filter((t) => t.done).length;
  if (!tasks.length || !done) return null;
  if (done === tasks.length) return capacity <= 2 ? `You did all ${done} on a low-energy day. That's a good day.` : `All ${done} done. Nice work.`;
  if (hour >= 17) return capacity <= 2 ? `You did ${done} of ${tasks.length} on a low-energy day. That's a good day.` : `You did ${done} of ${tasks.length} today. That counts.`;
  return null;
}

// ---------- Storage (never saves over plans it couldn't read) ----------
export async function loadPlans(now = new Date()): Promise<{ ok: true; plans: Plan[]; changed: boolean } | { ok: false }> {
  let raw: string | null;
  try { raw = await AsyncStorage.getItem(PLANS_KEY); } catch { return { ok: false }; }
  if (!raw) return { ok: true, plans: [], changed: false };
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch {
    try { await AsyncStorage.setItem(`${PLANS_KEY}_unreadable`, raw); } catch { return { ok: false }; }
    return { ok: true, plans: [], changed: false };
  }
  if (!Array.isArray(parsed)) return { ok: false };
  return { ok: true, ...normalisePlans(parsed, now) };
}
export const savePlans = (plans: Plan[]) => AsyncStorage.setItem(PLANS_KEY, JSON.stringify(plans));

/** Energy suggestion from today's check-in (1-5), if there is one. */
export async function todaysCheckInEnergy(today: string): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem('daily_check_ins');
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return null;
    const e = list.find((c: any) => c && typeof c.createdAt === 'string' && dayKey(new Date(c.createdAt)) === today && Number.isInteger(c.energy));
    return e ? Math.min(5, Math.max(1, e.energy)) : null;
  } catch { return null; }
}
