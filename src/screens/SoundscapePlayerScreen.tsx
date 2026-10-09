import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useSession } from '../lib/session';
import { NotAudioError, SOUNDSCAPES, cachedUri, canPlay, forgetCached, saveForOffline, soundscapeUrl } from '../lib/soundscapes';
import { Looper } from '../lib/looper';
import { useActivitySession } from '../lib/useActivitySession';
import FeedbackCard from '../components/FeedbackCard';

const TIMERS: (number | null)[] = [null, 15, 30, 60];
const MIN_LISTEN_S = 60; // "Did this help?" after at least a minute of listening
const clock = (ms: number) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export default function SoundscapePlayerScreen() {
  const navigation = useNavigation<any>();
  const { id } = (useRoute<any>().params ?? {}) as { id?: string };
  const track = SOUNDSCAPES.find((s) => s.id === id);
  const { plus } = useSession();
  const [state, setState] = useState<'preparing' | 'ready' | 'error'>('preparing');
  const [offline, setOffline] = useState<'saved' | 'streaming' | null>(null);
  const [playing, setPlaying] = useState(false);
  const [timer, setTimer] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [listened, setListened] = useState(0);
  const [ended, setEnded] = useState<'sleep' | 'done' | null>(null);
  const looper = useRef<Looper | null>(null);
  const healthTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [errorText, setErrorText] = useState("Couldn't load this soundscape. Check your connection.");
  // The chosen sleep timer lives here so every new player (first load, Retry) gets it.
  const timerRef = useRef<number | null>(null);
  // Listening time for the current session: real playback seconds, measured by the player.
  const listenedRef = useRef(0);
  const sessionBase = useRef(0);
  const session = useActivitySession('soundscape', undefined, { measure: () => listenedRef.current });
  const stopWatchdog = () => { if (healthTimer.current) { clearInterval(healthTimer.current); healthTimer.current = null; } };

  const load = useCallback(async (fresh = false) => {
    if (!track) return;
    setState('preparing');
    setPlaying(false);
    stopWatchdog();
    if (fresh) forgetCached(track.id); // Retry: download again rather than reuse a saved copy
    looper.current?.destroy(); looper.current = null;
    session.abandon(); // a new player starts a new listening session
    let source = cachedUri(track.id);
    if (source) setOffline('saved');
    else {
      try { source = await saveForOffline(track.id); setOffline(source.startsWith('http') ? null : 'saved'); }
      catch (e) {
        if (e instanceof NotAudioError) { setErrorText("The sound couldn't be downloaded properly. Please try again in a moment."); setState('error'); return; }
        source = soundscapeUrl(track.id); setOffline('streaming'); // network problem saving: play online instead
      }
    }
    try {
      await Looper.prepareAudioSession();
      const l = new Looper(source);
      l.setSleepTimer(timerRef.current); // keep the timer chosen while preparing / before Retry
      setRemaining(l.sleepRemainingMs());
      sessionBase.current = 0; listenedRef.current = 0; setListened(0);
      l.onTick = () => {
        listenedRef.current = Math.max(0, l.playedSeconds() - sessionBase.current);
        setListened(Math.floor(listenedRef.current));
        setRemaining(l.sleepRemainingMs());
      };
      l.onSleepEnd = () => {
        stopWatchdog(); setPlaying(false);
        timerRef.current = null; setTimer(null); setRemaining(null);
        setEnded('sleep'); session.finish();
      };
      looper.current = l;
      setState('ready');
    } catch {
      setErrorText("Couldn't load this soundscape. Check your connection.");
      setState('error');
    }
  }, [track]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (track && !canPlay(track, plus)) { navigation.replace('Subscription'); return; }
    load();
    return () => { stopWatchdog(); looper.current?.destroy(); looper.current = null; };
  }, [track?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!track) return <View style={[styles.page, styles.center]}><Text style={styles.subtitle}>This soundscape isn't available.</Text></View>;

  const toggle = () => {
    const l = looper.current; if (!l || state !== 'ready') return;
    if (playing) { stopWatchdog(); l.pause(); session.pause(); setPlaying(false); return; }
    setEnded(null);
    if (!session.active()) { sessionBase.current = l.playedSeconds(); listenedRef.current = 0; setListened(0); } // fresh session
    session.begin(); l.play(); setPlaying(true);
    // Watchdog: if the sound doesn't start within 8 s, or stops moving for 15 s while "playing",
    // stop and say so (with Retry) instead of staying silent. Waiting time is never counted as listening.
    const startedAt = Date.now();
    stopWatchdog();
    healthTimer.current = setInterval(() => {
      if (looper.current !== l || !l.playing) { stopWatchdog(); return; }
      const neverStarted = l.playedSeconds() <= sessionBase.current && Date.now() - startedAt >= 8000;
      if (neverStarted || l.stalledFor(15000)) {
        stopWatchdog(); l.pause(); session.pause(); setPlaying(false);
        setErrorText(neverStarted ? "This soundscape didn't start playing. Tap Retry to download it again." : 'The sound stopped unexpectedly. Tap Retry to load it again.');
        setState('error');
      }
    }, 2000);
  };
  const chooseTimer = (m: number | null) => { timerRef.current = m; setTimer(m); looper.current?.setSleepTimer(m); setRemaining(looper.current?.sleepRemainingMs() ?? (m ? m * 60_000 : null)); };
  const done = () => {
    stopWatchdog(); looper.current?.pause(); session.pause(); setPlaying(false);
    if (listened >= MIN_LISTEN_S) { session.finish(); setEnded('done'); } else navigation.goBack();
  };

  return <View style={styles.page}>
    <Image source={track.image} style={[StyleSheet.absoluteFill, styles.fill]} resizeMode="cover" blurRadius={1} />
    <View style={styles.shade} />
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={track.image} style={styles.cover} resizeMode="cover" accessibilityIgnoresInvertColors />
      <Text style={styles.group}>{track.group.toUpperCase()}</Text>
      <Text style={styles.title}>{track.title}</Text>
      <Text style={styles.subtitle}>{track.subtitle}</Text>

      {state === 'preparing' ? <View style={styles.status}><ActivityIndicator color="#e2e8f0" /><Text style={styles.statusText}>Preparing (first time only)…</Text></View>
        : state === 'error' ? <View style={styles.status}><Icon name="cloud-offline-outline" size={18} color="#fca5a5" /><Text style={styles.errorText}>{errorText}</Text><TouchableOpacity onPress={() => load(true)}><Text style={styles.retry}>Retry</Text></TouchableOpacity></View>
        : <TouchableOpacity style={styles.play} onPress={toggle} accessibilityRole="button" accessibilityLabel={playing ? 'Pause' : 'Play'}>
            <Icon name={playing ? 'pause' : 'play'} size={38} color="#0f172a" style={playing ? undefined : { marginLeft: 4 }} />
          </TouchableOpacity>}
      {state === 'ready' ? <Text style={styles.offline}>{offline === 'saved' ? 'Saved on this phone: plays offline' : offline === 'streaming' ? 'Playing online (couldn\u2019t save for offline)' : ''}</Text> : null}

      <Text style={styles.label}>Sleep timer</Text>
      <View style={styles.timers}>
        {TIMERS.map((m) => <TouchableOpacity key={String(m)} onPress={() => chooseTimer(m)} style={[styles.timer, timer === m && styles.timerOn]} accessibilityRole="button" accessibilityState={{ selected: timer === m }}>
          <Text style={[styles.timerText, timer === m && styles.timerTextOn]}>{m ? `${m} min` : 'Off'}</Text>
        </TouchableOpacity>)}
      </View>
      {timer && remaining !== null ? <Text style={styles.countdown}>{playing ? `Stops in ${clock(remaining)}, fading gently at the end` : `Stops after ${clock(remaining)} of playing`}</Text> : <Text style={styles.countdown}>Plays until you stop it</Text>}

      {ended ? <>
        <Text style={styles.endedText}>{ended === 'sleep' ? 'Your sleep timer finished.' : 'Nice pause.'}</Text>
        {session.finishedId ? <FeedbackCard key={session.finishedId} sessionId={session.finishedId} /> : null}
      </> : playing || listened > 0 ? <TouchableOpacity style={styles.doneButton} onPress={done} accessibilityRole="button"><Text style={styles.doneText}>Done</Text></TouchableOpacity> : null}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' }, // explicit size: otherwise web renders images at their natural pixel size
  page: { flex: 1, backgroundColor: '#0f172a' },
  center: { alignItems: 'center', justifyContent: 'center' },
  shade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(2,6,23,0.72)' },
  container: { alignItems: 'center', padding: 24, paddingBottom: 48, width: '100%', maxWidth: 520, alignSelf: 'center' },
  cover: { width: 210, height: 280, borderRadius: 22, marginTop: 8 },
  group: { color: '#94a3b8', fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginTop: 20 },
  title: { color: '#f8fafc', fontSize: 28, fontWeight: '800', marginTop: 4 },
  subtitle: { color: '#cbd5e1', fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 28, minHeight: 84 },
  statusText: { color: '#e2e8f0' }, errorText: { color: '#fecaca', flexShrink: 1 }, retry: { color: '#93c5fd', fontWeight: '800' },
  play: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  offline: { color: '#94a3b8', fontSize: 12, marginTop: 10, minHeight: 16 },
  label: { color: '#e2e8f0', fontWeight: '800', marginTop: 26, alignSelf: 'flex-start' },
  timers: { flexDirection: 'row', gap: 8, marginTop: 10, alignSelf: 'stretch' },
  timer: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#475569', borderRadius: 14, paddingVertical: 10 },
  timerOn: { backgroundColor: '#e2e8f0', borderColor: '#e2e8f0' },
  timerText: { color: '#e2e8f0', fontWeight: '700' }, timerTextOn: { color: '#0f172a' },
  countdown: { color: '#94a3b8', fontSize: 13, marginTop: 10 },
  doneButton: { marginTop: 24, borderWidth: 1, borderColor: '#475569', borderRadius: 22, paddingVertical: 12, paddingHorizontal: 34 },
  doneText: { color: '#e2e8f0', fontWeight: '800' },
  endedText: { color: '#e2e8f0', fontWeight: '700', marginTop: 24 },
});
