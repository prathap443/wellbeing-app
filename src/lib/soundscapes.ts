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
const AUDIO_VERSION = 1;
export const soundscapeUrl = (id: string) => `${API_URL}/soundscapes/${id}.m4a?v=${AUDIO_VERSION}`;
export const canPlay = (s: Soundscape, plus: boolean) => s.free || plus;

const cacheDir = () => new Directory(Paths.document, 'soundscapes');
const cacheFile = (id: string) => new File(cacheDir(), `${id}.v${AUDIO_VERSION}.m4a`);

/** Local file if already saved, otherwise null. */
export function cachedUri(id: string): string | null {
  if (Platform.OS === 'web') return null;
  try { const f = cacheFile(id); return f.exists && f.size > 0 ? f.uri : null; } catch { return null; }
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
  const partial = new File(dir, `${id}.v${AUDIO_VERSION}.part`);
  if (partial.exists) partial.delete();
  const downloaded = await File.downloadFileAsync(soundscapeUrl(id), partial);
  const done = cacheFile(id);
  if (done.exists) done.delete();
  (downloaded as File).move(done);
  return done.uri;
}
