import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import { API_URL } from './coach';

// Original soundscapes (owned by Pradi Consulting). Audio is served by our server and saved on the
// phone after the first play, so it works offline afterwards. Covers ship inside the app.
export type Soundscape = { id: string; title: string; subtitle: string; group: 'Calm' | 'Sleep' | 'Focus' | 'Nature'; image: number; free: boolean };

export const SOUNDSCAPES: Soundscape[] = [
  { id: 'soft-rain', title: 'Soft rain', subtitle: 'Rain on the window, a warm chord beneath', group: 'Calm', image: require('../../assets/content/sound-soft-rain.jpg'), free: true },
  { id: 'ocean-swell', title: 'Ocean swell', subtitle: 'Slow waves drifting side to side', group: 'Calm', image: require('../../assets/content/sound-ocean-swell.jpg'), free: true },
  { id: 'deep-sleep', title: 'Deep sleep', subtitle: 'A still, deep drone with nothing to wake you', group: 'Sleep', image: require('../../assets/content/sound-deep-sleep.jpg'), free: false },
  { id: 'warm-hearth', title: 'Warm hearth', subtitle: 'A crackling fire in a quiet room', group: 'Sleep', image: require('../../assets/content/sound-warm-hearth.jpg'), free: false },
  { id: 'focus-flow', title: 'Focus flow', subtitle: 'A running stream, no melody to follow', group: 'Focus', image: require('../../assets/content/sound-focus-flow.jpg'), free: false },
  { id: 'morning-light', title: 'Morning light', subtitle: 'A bright chord, a breeze and early birds', group: 'Focus', image: require('../../assets/content/sound-morning-light.jpg'), free: false },
  { id: 'forest-dusk', title: 'Forest dusk', subtitle: 'Wind in the trees and distant birdsong', group: 'Nature', image: require('../../assets/content/sound-forest-dusk.jpg'), free: false },
  { id: 'night-garden', title: 'Night garden', subtitle: 'Crickets and a soft night breeze', group: 'Nature', image: require('../../assets/content/sound-night-garden.jpg'), free: false },
];
export const SOUNDSCAPE_GROUPS: Soundscape['group'][] = ['Calm', 'Sleep', 'Focus', 'Nature'];
export const SOUNDSCAPES_BANNER = require('../../assets/content/banner-soundscapes.jpg');
/** Bump when the audio files change, so phones fetch the new versions instead of reusing old copies. */
const AUDIO_VERSION = 2; // v2: files are now verified; any v1 copies (possibly not audio) are ignored and removed
export const soundscapeUrl = (id: string) => `${API_URL}/soundscapes/${id}.m4a?v=${AUDIO_VERSION}`;
export const canPlay = (s: Soundscape, plus: boolean) => s.free || plus;

const cacheDir = () => new Directory(Paths.document, 'soundscapes');
const cacheFile = (id: string) => new File(cacheDir(), `${id}.v${AUDIO_VERSION}.m4a`);

export class NotAudioError extends Error {}
const MIN_AUDIO_BYTES = 100_000;

/**
 * True only for a real audio file: big enough, and with the MP4/M4A signature ("ftyp" at bytes 4-7).
 * A web page or error message saved under an .m4a name fails this, instead of playing as silence.
 */
export function isAudioFile(file: File): boolean {
  try {
    if (!file.exists || (file.size ?? 0) < MIN_AUDIO_BYTES) return false;
    const handle = file.open();
    try {
      const b = handle.readBytes(12);
      return b.length >= 8 && String.fromCharCode(b[4], b[5], b[6], b[7]) === 'ftyp';
    } finally { handle.close(); }
  } catch { return false; }
}

/** Local file if already saved AND verified as audio; a bad copy is deleted. Otherwise null. */
export function cachedUri(id: string): string | null {
  if (Platform.OS === 'web') return null;
  try {
    const f = cacheFile(id);
    if (!f.exists) return null;
    if (isAudioFile(f)) return f.uri;
    f.delete();
    return null;
  } catch { return null; }
}

/** Removes a saved copy (used by Retry), so the next play downloads it again. */
export function forgetCached(id: string) {
  if (Platform.OS === 'web') return;
  try { const f = cacheFile(id); if (f.exists) f.delete(); } catch { /* nothing to remove */ }
}

/** Deletes saved files from older versions (they may not be audio). */
function removeOldVersions(dir: Directory) {
  try {
    for (const entry of dir.list()) {
      if (entry instanceof File && !entry.name.includes(`.v${AUDIO_VERSION}.`)) entry.delete();
    }
  } catch { /* best effort */ }
}

/**
 * Saves the track on the phone so it plays offline afterwards. Downloads to a temporary name first and
 * only then renames, so an interrupted download never leaves a broken file that looks complete.
 */
export async function saveForOffline(id: string): Promise<string> {
  if (Platform.OS === 'web') return soundscapeUrl(id);
  const existing = cachedUri(id);
  if (existing) return existing;
  const dir = cacheDir();
  if (!dir.exists) dir.create({ intermediates: true });
  removeOldVersions(dir);
  const partial = new File(dir, `${id}.v${AUDIO_VERSION}.part`);
  if (partial.exists) partial.delete();
  const downloaded = await File.downloadFileAsync(soundscapeUrl(id), partial);
  const got = downloaded as File;
  if (!isAudioFile(got)) { try { got.delete(); } catch { /* ignore */ } throw new NotAudioError('downloaded file is not audio'); }
  const done = cacheFile(id);
  if (done.exists) done.delete();
  got.move(done);
  return done.uri;
}
