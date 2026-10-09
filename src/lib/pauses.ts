// Short calm videos (original, owned by Pradi Consulting). Served by our server and cached on the phone
// by the player after the first watch. Posters ship inside the app so lists appear instantly.
import { API_URL } from './coach';

export type Pause = { id: string; title: string; words: string; poster: number };

export const PAUSES: Pause[] = [
  { id: '01', title: "One small step is enough", words: "You don’t have to figure everything out today. Take a breath. Choose one small step. Begin gently.", poster: require('../../assets/content/motivation-01.jpg') },
  { id: '02', title: "Your effort still counts", words: "A difficult day doesn’t erase your progress. Your effort still counts. Give yourself room to rest. Begin again at your own pace.", poster: require('../../assets/content/motivation-02.jpg') },
  { id: '03', title: "You’re allowed to pause", words: "You don’t have to earn your rest. Let your shoulders soften. Take this moment for yourself. You’re allowed to pause.", poster: require('../../assets/content/motivation-03.jpg') },
  { id: '04', title: "Your pace is your own", words: "You don’t have to match anyone else’s pace. Notice what you need today. Take your time. Your next step can be gentle.", poster: require('../../assets/content/motivation-04.jpg') },
  { id: '05', title: "Let today be enough", words: "Some things can wait until tomorrow. For now, let the day settle. You’re allowed a quiet moment. Let today be enough.", poster: require('../../assets/content/motivation-05.jpg') },
  { id: '06', title: "A little hello can be a start", words: "You don’t need the perfect words to reach out. A little hello can be a start. When you feel ready, connect with someone you trust.", poster: require('../../assets/content/motivation-06.jpg') },
  { id: '07', title: "Small joys still matter", words: "A little sunlight. A favourite song. A moment that feels lighter. You don’t have to feel happy all day. Small joys still matter.", poster: require('../../assets/content/motivation-07.jpg') },
  { id: '08', title: "You can begin again", words: "Plans change. Some days are harder than you expected. You can begin again without having everything figured out. Start from where you are.", poster: require('../../assets/content/motivation-08.jpg') },
];

/** Bump when the video files change, so phones don't keep showing cached old versions. */
const VIDEO_VERSION = 1;
export const pauseUrl = (id: string) => `${API_URL}/motivation/motivation-${id}.mp4?v=${VIDEO_VERSION}`;

/** The same pause all day, a different one each day (local date), cycling through all of them. */
export function todaysPause(now = new Date()): Pause {
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);
  return PAUSES[((day % PAUSES.length) + PAUSES.length) % PAUSES.length];
}
