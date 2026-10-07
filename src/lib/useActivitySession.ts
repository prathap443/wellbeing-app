import { useCallback, useEffect, useRef, useState } from 'react';
import { finishActivity, newActivityId, startActivity, type Feeling, type Tool } from './activity';

/**
 * Tracks one tool session. begin() when the activity actually starts, finish() when it is
 * finished (timer ended or "Finish" tapped). Leaving the screen before finishing is saved
 * automatically as not completed. `finishedId` is set once finished, to show "Did this help?".
 */
export function useActivitySession(tool: Tool, feeling?: Feeling) {
  const id = useRef<string | null>(null);
  const startedAt = useRef(0);
  const done = useRef(false);
  const [finishedId, setFinishedId] = useState<string | null>(null);
  const elapsed = () => (Date.now() - startedAt.current) / 1000;

  const begin = useCallback(() => {
    if (id.current && !done.current) return;
    id.current = newActivityId();
    startedAt.current = Date.now();
    done.current = false;
    setFinishedId(null);
    startActivity(id.current, tool, feeling).catch(() => undefined);
  }, [tool, feeling]);

  const finish = useCallback(() => {
    if (!id.current || done.current) return;
    done.current = true;
    finishActivity(id.current, true, elapsed()).catch(() => undefined);
    setFinishedId(id.current);
  }, []);

  /** Ends an unfinished session without counting it as completed (e.g. switching practice). */
  const abandon = useCallback(() => {
    if (id.current && !done.current) finishActivity(id.current, false, elapsed()).catch(() => undefined);
    id.current = null; done.current = false; setFinishedId(null);
  }, []);

  useEffect(() => () => {
    if (id.current && !done.current) finishActivity(id.current, false, elapsed()).catch(() => undefined);
  }, []);

  return { begin, finish, abandon, finishedId, active: () => !!id.current && !done.current };
}
