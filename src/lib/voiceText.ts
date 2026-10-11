// Pure helpers for voice journal entries (no React Native imports, so they can be unit-tested in Node).

/** Longest single recording. Long enough to say what's on your mind; short enough to stay a journal. */
export const MAX_LISTEN_MS = 3 * 60_000;

// ---------- Transcript assembly (pure, unit-tested) ----------
// The recogniser sends partial results that replace each other, and final results that close a phrase.
// Some iOS versions restart the partial text after a pause without sending a final result first; when the
// new partial clearly isn't a continuation, the previous one is kept rather than lost.

export type Transcript = { base: string; committed: string; live: string };

const join = (...parts: string[]) => parts.map((p) => p.trim()).filter(Boolean).join(' ');

/** Start a recording after whatever text is already in the box (speaking adds to it, never replaces it). */
export const beginTranscript = (existing: string): Transcript => ({ base: existing.trim(), committed: '', live: '' });

export function addResult(t: Transcript, text: string, isFinal: boolean): Transcript {
  const next = text.trim();
  if (isFinal) return { ...t, committed: join(t.committed, next), live: '' };
  const prev = t.live;
  const restarted = prev.length >= 12 && next.length < prev.length * 0.6
    && !prev.toLowerCase().startsWith(next.toLowerCase().slice(0, Math.min(8, next.length)));
  return restarted ? { ...t, committed: join(t.committed, prev), live: next } : { ...t, live: next };
}

export const transcriptText = (t: Transcript) => join(t.base, t.committed, t.live);

// ---------- Support check (on the phone only) ----------
// Explicit statements about ending one's life or self-harm show a calm support card with crisis lines.
// Nothing is blocked, stored or sent anywhere. Deliberately narrow, to avoid interrupting ordinary venting.

const RISK_PATTERNS: RegExp[] = [
  /\b(kill|killing|hurt|hurting|harm|harming|cut|cutting)\s+myself\b/,
  /\bend(ing)?\s+(my|it)\s+(life|all)\b/,
  /\b(take|taking)\s+my\s+(own\s+)?life\b/,
  /\bsuicid(e|al)\b/,
  /\b(want|wanted|wish)\s+(to\s+)?(be\s+)?dead\b/,
  /\b(wish|want)\s+i\s+(was|were)\s+dead\b/,
  /\bwant(ed)?\s+to\s+die\b/,
  /\bdon'?t\s+want\s+to\s+(be\s+alive|live|wake\s+up)\b/,
  /\bno\s+(reason|point)\s+(to|in)\s+(live|living|go(ing)?\s+on)\b/,
  /\bbetter\s+off\s+without\s+me\b/,
  /\bself[-\s]?harm/,
];

export function needsSupport(text: string): boolean {
  const t = text.toLowerCase().replace(/[’‘]/g, "'");
  return RISK_PATTERNS.some((re) => re.test(t));
}
