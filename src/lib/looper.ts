import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

const CROSSFADE_S = 1.5;
const TICK_MS = 250;
export const SLEEP_FADE_S = 20;

/** Calls into a native player, ignoring errors from a player that has already been released (otherwise the app crashes). */
const safe = (fn: () => void) => { try { fn(); } catch { /* player already released */ } };

/**
 * Plays a soundscape forever without a click: shortly before the end, a second copy starts from the
 * beginning and the two crossfade (equal-power), which hides the codec's start/end boundary.
 *
 * Driven by a timer AND the players' native status updates, so if iOS slows JavaScript while the
 * screen is locked the other source keeps it going. Both players also loop natively as a last resort.
 *
 * Sleep timer: counts playing time only (pausing freezes it). The sound fades over the final
 * 20 seconds and stops at exactly the chosen length.
 *
 * playedSeconds(): real listening time, measured from the audio position moving forward (not the
 * clock), so loading, buffering, stalls and pauses are never counted, and background play is.
 */
export class Looper {
  private players: [AudioPlayer, AudioPlayer];
  private active = 0;
  private fadeStart: number | null = null;
  private master = 1;
  private interval: ReturnType<typeof setInterval> | null = null;
  private subs: { remove: () => void }[] = [];
  private stopped = false;
  // sleep timer (playing time)
  private sleepTotalMs: number | null = null;
  private sleepUsedMs = 0;
  private sleepTickAt: number | null = null;
  // listening measurement
  private played = 0;
  private lastPos: number | null = null;
  private lastPosPlayer = -1;
  private lastPosAt = 0;
  private lastAdvanceAt = 0;
  playing = false;
  onSleepEnd?: () => void;
  onTick?: () => void;

  constructor(source: string) {
    this.players = [createAudioPlayer(source, { updateInterval: 250 }), createAudioPlayer(source, { updateInterval: 250 })];
    for (const p of this.players) {
      p.loop = true; // fallback only: in normal use the crossfade starts before the end
      p.volume = 0;
      this.subs.push(p.addListener('playbackStatusUpdate', () => this.tick()));
    }
  }

  static async prepareAudioSession() {
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
  }

  play() {
    if (this.stopped || this.playing) return;
    const p = this.players[this.active];
    safe(() => { p.volume = this.fadeStart === null ? this.master : p.volume; p.play(); });
    if (this.fadeStart !== null) safe(() => this.players[1 - this.active].play());
    this.playing = true;
    const now = Date.now();
    this.sleepTickAt = now;
    this.lastPos = null; // don't count the gap while paused
    this.lastAdvanceAt = now;
    if (!this.interval) this.interval = setInterval(() => this.tick(), TICK_MS);
  }

  pause() {
    this.accrueSleep(Date.now());
    for (const p of this.players) safe(() => p.pause());
    this.playing = false;
    this.sleepTickAt = null;
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
  }

  /** Sleep timer in minutes of playing, or null for off. Changing it always restores full volume. */
  setSleepTimer(minutes: number | null) {
    this.sleepTotalMs = minutes ? minutes * 60_000 : null;
    this.sleepUsedMs = 0;
    this.sleepTickAt = this.playing ? Date.now() : null;
    this.setMaster(1);
  }
  /** Time left until the sound stops, or null when the timer is off. */
  sleepRemainingMs() {
    if (this.sleepTotalMs === null) return null;
    this.accrueSleep(Date.now());
    return Math.max(0, this.sleepTotalMs - this.sleepUsedMs);
  }

  /** Seconds the audio has actually played. */
  playedSeconds() { return this.played; }
  /** True if playing but the audio position hasn't moved for this long (stalled, buffering or failed). */
  stalledFor(ms: number) { return this.playing && Date.now() - this.lastAdvanceAt >= ms; }

  private accrueSleep(now: number) {
    if (this.sleepTickAt !== null && this.playing) { this.sleepUsedMs += now - this.sleepTickAt; this.sleepTickAt = now; }
  }

  private setMaster(v: number) {
    this.master = Math.max(0, Math.min(1, v));
    if (this.fadeStart === null) { const p = this.players[this.active]; safe(() => { p.volume = this.master; }); }
  }

  private measure(now: number) {
    const cur = this.players[this.active];
    let pos: number;
    try { if (!cur.isLoaded) return; pos = cur.currentTime; } catch { return; }
    if (this.lastPos !== null && this.lastPosPlayer === this.active) {
      const delta = pos - this.lastPos;
      const wall = (now - this.lastPosAt) / 1000;
      // Count forward movement, never more than real time passed (guards against seeks and jumps).
      if (delta > 0.01) { this.played += Math.min(delta, wall + 0.5); this.lastAdvanceAt = now; }
    } else if (this.lastPosPlayer !== this.active && this.lastPos !== null) {
      this.lastAdvanceAt = now; // crossfade handover: the new copy is playing
    }
    this.lastPos = pos; this.lastPosPlayer = this.active; this.lastPosAt = now;
  }

  private tick() {
    if (this.stopped || !this.playing) return;
    const now = Date.now();
    this.measure(now);

    // Sleep timer: fade over the final 20 s, stop at exactly the chosen length.
    if (this.sleepTotalMs !== null) {
      this.accrueSleep(now);
      const left = this.sleepTotalMs - this.sleepUsedMs;
      if (left <= 0) {
        this.pause();
        this.sleepTotalMs = null; this.sleepUsedMs = 0;
        this.setMaster(1);
        this.onSleepEnd?.();
        return;
      }
      if (left <= SLEEP_FADE_S * 1000) this.setMaster(left / (SLEEP_FADE_S * 1000));
    }
    this.onTick?.();

    const cur = this.players[this.active];
    const next = this.players[1 - this.active];
    let loaded = false, duration = 0, position = 0;
    try { loaded = cur.isLoaded; duration = cur.duration; position = cur.currentTime; } catch { return; }
    if (!loaded || !duration) return;

    if (this.fadeStart === null) {
      if (duration - position <= CROSSFADE_S) {
        this.fadeStart = now;
        safe(() => { next.volume = 0; next.seekTo(0).catch(() => undefined); next.play(); });
      }
      return;
    }
    const x = Math.min(1, (now - this.fadeStart) / (CROSSFADE_S * 1000));
    safe(() => { cur.volume = this.master * Math.cos((x * Math.PI) / 2); }); // equal-power: no dip in loudness
    safe(() => { next.volume = this.master * Math.sin((x * Math.PI) / 2); });
    if (x >= 1) {
      safe(() => { cur.pause(); cur.seekTo(0).catch(() => undefined); cur.volume = 0; });
      this.active = 1 - this.active;
      this.fadeStart = null;
    }
  }

  destroy() {
    if (this.stopped) return;
    this.stopped = true;
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
    for (const s of this.subs) safe(() => s.remove());
    for (const p of this.players) { safe(() => p.pause()); safe(() => p.remove()); }
    this.playing = false;
  }
}
