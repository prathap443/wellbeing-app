import { useCallback, useEffect, useState } from 'react';
import { connectHealth, disconnectHealth, healthAvailable, isHealthConnected, readHealthDays, type HealthDay } from './health';

/** Apple Health state for a screen; refreshes whenever the screen comes into focus. */
export function useHealth(navigation: { addListener: (event: 'focus', cb: () => void) => () => void }, days = 14) {
  const available = healthAvailable();
  const [connected, setConnected] = useState(false);
  const [data, setData] = useState<HealthDay[] | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!available) return;
    const isOn = await isHealthConnected();
    setConnected(isOn);
    if (!isOn) { setData(null); return; }
    setLoading(true);
    try { setData(await readHealthDays(days)); } catch { setData([]); } finally { setLoading(false); }
  }, [available, days]);

  useEffect(() => navigation.addListener('focus', refresh), [navigation, refresh]);
  useEffect(() => { refresh(); }, [refresh]);

  const connect = useCallback(async () => {
    try { await connectHealth(); } catch { /* user can retry from Settings */ }
    await refresh();
  }, [refresh]);

  const disconnect = useCallback(async () => {
    await disconnectHealth();
    await refresh();
  }, [refresh]);

  const hasData = !!data?.some((d) => d.steps !== null || d.sleepMinutes !== null);
  return { available, connected, data, loading, hasData, connect, disconnect, refresh };
}
