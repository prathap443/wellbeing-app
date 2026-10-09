import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

const CROSSFADE_S = 1.5;
const TICK_MS = 100;
const SLEEP_FADE_S = 20;

/**
 * Plays a soundscape forever without a click: shortly before the end, a second copy starts from the
 * beginning and the two crossfade (equal-power), which hides the codec's start/end boundary and any
 * pause when jumping back to the start.
 *
 * Driven by a timer AND the players' native status updates, so if iOS slows JavaScript while the
 * screen is locked the other source keeps it going. Both players also loop natively as a last resort:
 * if JavaScript stalled completely, the track would loop on its own rather than stop.
 */
export class Looper {
  private players: [AudioPlayer, AudioPlayer];
  private active = 0;
  private fadeStart: number | null = null;
  private master = 1;
  private interval: ReturnType<typeof setInterval> | null = null;
  private subs: { remove: () => void }[] = [];
  private sleepAt: number | null = null; // wall-clock time to start the sleep fade
  private stopped = false;
  playing = false;
  onSleepEnd?: () => void;
  onActiveSecond?: () => void;

  constructor(source: string) {
    this.players = [createAudioPlayer(source, { updateInterval: 250 }), createAudioPlayer(source, { updateInterval: 250 })];
    for (const p of this.players) {
      p.loop = true; // fallback only: in normal use the crossfade always starts before the end
      p.volume = 0;
      this.subs.push(p.addListener('playbackStatusUpdate', () => this.tick()));
    }
  }

  static async prepareAudioSession() {
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
  }

  play() {
    if (this.stopped) return;
    const p = this.players[this.active];
    p.volume = this.master;
    p.play();
    if (this.fadeStart !== null) this.players[1 - this.active].play();
    this.playing = true;
    if (!this.interval) this.interval = setInterval(() => this.tick(), TICK_MS);
  }

  pause() {
    for (const p of this.players) p.pause();
    this.playing = false;
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
  }

  /** Sleep timer: minutes from now, or null to switch it off. */
  setSleepTimer(minutes: number | null) {
    this.sleepAt = minutes ? Date.now() + minutes * 60_000 : null;
    if (!minutes) this.setMaster(1);
  }
  sleepRemainingMs() { return this.sleepAt === null ? null : Math.max(0, this.sleepAt + SLEEP_FADE_S * 1000 - Date.now()); }

  private setMaster(v: number) {
    this.master = Math.max(0, Math.min(1, v));
    if (this.fadeStart === null) this.players[this.active].volume = this.master;
  }

  private lastSecond = 0;
  private tick() {
    if (this.stopped || !this.playing) return;
    const now = Date.now();
    if (now - this.lastSecond >= 1000) { this.lastSecond = now; this.onActiveSecond?.(); }

    // Sleep timer: a gentle 20-second fade, then stop.
    if (this.sleepAt !== null && now >= this.sleepAt) {
      const x = (now - this.sleepAt) / (SLEEP_FADE_S * 1000);
      if (x >= 1) { this.pause(); this.sleepAt = null; this.master = 1; this.onSleepEnd?.(); return; }
      this.setMaster(1 - x);
    }

    const cur = this.players[this.active];
    const next = this.players[1 - this.active];
    if (!cur.isLoaded || !cur.duration) return;

    if (this.fadeStart === null) {
      if (cur.duration - cur.currentTime <= CROSSFADE_S) {
        this.fadeStart = now;
        next.volume = 0;
        next.seekTo(0).catch(() => undefined);
        next.play();
      }
      return;
    }
    const x = Math.min(1, (now - this.fadeStart) / (CROSSFADE_S * 1000));
    cur.volume = this.master * Math.cos((x * Math.PI) / 2); // equal-power: no dip in loudness
    next.volume = this.master * Math.sin((x * Math.PI) / 2);
    if (x >= 1) {
      cur.pause();
      cur.seekTo(0).catch(() => undefined);
      cur.volume = 0;
      this.active = 1 - this.active;
      this.fadeStart = null;
    }
  }

  /** Playback health: true once the active player has actually loaded and moved forward. */
  isProgressing() { const p = this.players[this.active]; return p.isLoaded && p.currentTime > 0; }

  destroy() {
    this.stopped = true;
    this.pause();
    for (const s of this.subs) s.remove();
    for (const p of this.players) { try { p.remove(); } catch { /* already released */ } }
  }
}
