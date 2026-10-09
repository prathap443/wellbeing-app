import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { finishActivity, newActivityId, startActivity, type Feeling, type Tool } from './activity';

/**
 * Tracks one tool session.
 * - begin(): the activity actually starts (a new id each time after a finished session).
 * - pause() / resume(): user pauses; paused time is not counted.
 * - finish(): finished (timer ended or "Finish" tapped). `finishedId` is then set, to show "Did this help?".
 * Duration counts active time only. Sending the app to the background pauses the clock and returning
 * resumes it, if it was running. Leaving the screen before finishing is saved as not completed.
 *
 * options.measure: for tools that keep playing in the background (soundscapes), the duration comes from
 * this function (real playback time) instead of the clock, and backgrounding does not pause anything.
 */
export function useActivitySession(tool: Tool, feeling?: Feeling, options?: { measure?: () => number }) {
  const measureRef = useRef(options?.measure);
  measureRef.current = options?.measure;
  const id = useRef<string | null>(null);
  const done = useRef(false);
  const activeMs = useRef(0);
  const runningSince = useRef<number | null>(null);
  const pausedByApp = useRef(false);
  const [finishedId, setFinishedId] = useState<string | null>(null);

  const clockSeconds = () => (activeMs.current + (runningSince.current ? Date.now() - runningSince.current : 0)) / 1000;
  const activeSeconds = () => (measureRef.current ? measureRef.current() : clockSeconds());
  const stopClock = () => { if (runningSince.current) { activeMs.current += Date.now() - runningSince.current; runningSince.current = null; } };
  const startClock = () => { if (!runningSince.current) runningSince.current = Date.now(); };
  const live = () => !!id.current && !done.current;

  const begin = useCallback(() => {
    if (live()) { startClock(); return; }
    id.current = newActivityId();
    done.current = false;
    activeMs.current = 0;
    runningSince.current = Date.now();
    setFinishedId(null);
    startActivity(id.current, tool, feeling).catch(() => undefined);
  }, [tool, feeling]);

  const pause = useCallback(() => { if (live()) stopClock(); }, []);
  const resume = useCallback(() => { if (live()) startClock(); }, []);

  const finish = useCallback(() => {
    if (!live()) return;
    stopClock();
    done.current = true;
    finishActivity(id.current!, true, activeSeconds()).catch(() => undefined);
    setFinishedId(id.current);
  }, []);

  /** Ends an unfinished session without counting it as completed (e.g. switching practice). */
  const abandon = useCallback(() => {
    if (live()) { stopClock(); finishActivity(id.current!, false, activeSeconds()).catch(() => undefined); }
    id.current = null; done.current = false; activeMs.current = 0; runningSince.current = null; setFinishedId(null);
  }, []);

  // Background pauses the clock; foreground resumes it only if it was running when the app left.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (measureRef.current) return; // background playback counts: duration is measured, not clocked
      if (state === 'active') { if (pausedByApp.current) { pausedByApp.current = false; resume(); } }
      else if (live() && runningSince.current) { pausedByApp.current = true; stopClock(); }
    });
    return () => sub.remove();
  }, [resume]);

  useEffect(() => () => {
    if (live()) { stopClock(); finishActivity(id.current!, false, activeSeconds()).catch(() => undefined); }
  }, []);

  return { begin, pause, resume, finish, abandon, finishedId, active: live };
}
