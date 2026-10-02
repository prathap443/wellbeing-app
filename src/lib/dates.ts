const DAY_FIRST = new Date(2020, 11, 31).toLocaleDateString().startsWith('31');

/**
 * Parses a mood entry date. Entries store `toLocaleDateString()` output, which
 * `new Date()` misreads in day-first locales (e.g. UK "02/10/2026" → 10 Feb).
 */
export function parseEntryDate(entry: { date: string; timestamp?: string }): Date {
  if (entry.timestamp) return new Date(entry.timestamp);
  const parts = entry.date.match(/^(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})$/);
  if (parts) {
    const [a, b, c] = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
    if (parts[1].length === 4) return new Date(a, b - 1, c);
    return DAY_FIRST ? new Date(c, b - 1, a) : new Date(c, a - 1, b);
  }
  return new Date(entry.date);
}

const dayNumber = (date: Date) => Math.round(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86400000);

/** Current and best run of consecutive days with at least one entry. */
export function calculateStreaks(entries: { date: string; timestamp?: string }[]): { current: number; best: number } {
  const days = [...new Set(entries.map((entry) => dayNumber(parseEntryDate(entry))).filter((n) => !Number.isNaN(n)))].sort((a, b) => b - a);
  if (days.length === 0) return { current: 0, best: 0 };
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = days[i - 1] - days[i] === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  const today = dayNumber(new Date());
  let current = 0;
  if (days[0] === today || days[0] === today - 1) {
    current = 1;
    while (current < days.length && days[current - 1] - days[current] === 1) current++;
  }
  return { current, best };
}
