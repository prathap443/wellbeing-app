// In-memory daily quota. Good enough for a single Replit instance; counts reset
// if the server restarts. Swap for Replit DB / Postgres when you scale out.

export const FREE_DAILY_QUESTIONS = Number(process.env.FREE_DAILY_QUESTIONS ?? 5);
const SUGGESTION_REFRESHES_PER_DAY = 6;
// Many people can share one IP (mobile carriers, offices), so this is only a backstop.
const PER_IP_DAILY = 60;

type Bucket = { day: string; count: number };
const buckets = new Map<string, Bucket>();

const today = (now: Date) => now.toISOString().slice(0, 10);

function bump(key: string, limit: number, now: Date): boolean {
  const day = today(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.day !== day) {
    buckets.set(key, { day, count: 1 });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

function used(key: string, now: Date): number {
  const bucket = buckets.get(key);
  return bucket && bucket.day === today(now) ? bucket.count : 0;
}

export function questionsRemaining(deviceId: string, now = new Date()): number {
  return Math.max(0, FREE_DAILY_QUESTIONS - used(`q:${deviceId}`, now));
}

/** Reserves one question. Call `refundQuestion` if the model call fails so users are not charged for errors. */
export function takeQuestion(deviceId: string, ip: string, now = new Date()): boolean {
  if (questionsRemaining(deviceId, now) <= 0) return false;
  if (!bump(`ip:${ip}`, PER_IP_DAILY, now)) return false;
  return bump(`q:${deviceId}`, FREE_DAILY_QUESTIONS, now);
}

export function refundQuestion(deviceId: string, ip: string): void {
  for (const key of [`q:${deviceId}`, `ip:${ip}`]) {
    const bucket = buckets.get(key);
    if (bucket && bucket.count > 0) bucket.count -= 1;
  }
}

export function takeSuggestionRefresh(deviceId: string, ip: string, now = new Date()): boolean {
  if (!bump(`ip:${ip}`, PER_IP_DAILY, now)) return false;
  return bump(`s:${deviceId}`, SUGGESTION_REFRESHES_PER_DAY, now);
}

/** Drops buckets from previous days so memory does not grow forever. */
export function pruneQuotas(now = new Date()): void {
  const day = today(now);
  for (const [key, bucket] of buckets) if (bucket.day !== day) buckets.delete(key);
}

export function resetQuotasForTests(): void {
  buckets.clear();
}
