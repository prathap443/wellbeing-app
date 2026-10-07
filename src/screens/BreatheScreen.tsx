import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import FeedbackCard from '../components/FeedbackCard';
import { useActivitySession } from '../lib/useActivitySession';
import type { Feeling } from '../lib/activity';

const PHASES = ['Breathe in', 'Hold', 'Breathe out', 'Hold'];
const LENGTHS = [1, 3, 5];
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function BreatheScreen() {
  const params = (useRoute<any>().params ?? {}) as { feeling?: Feeling; minutes?: number };
  const [minutes, setMinutes] = useState(LENGTHS.includes(params.minutes ?? 0) ? params.minutes! : 3);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [seconds, setSeconds] = useState(4);
  const [left, setLeft] = useState(minutes * 60);
  const [finished, setFinished] = useState(false);
  const session = useActivitySession('breathe', params.feeling);
  const started = left < minutes * 60;

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setSeconds((current) => {
        if (current > 1) return current - 1;
        setPhase((p) => (p + 1) % PHASES.length);
        return 4;
      });
      setLeft((l) => Math.max(0, l - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);

  // Timer ran out: the session is finished.
  useEffect(() => { if (running && left === 0) end(); }, [left, running]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => { if (!running) session.begin(); setRunning((r) => !r); };
  const end = () => { setRunning(false); setFinished(true); session.finish(); };
  const again = () => { setFinished(false); setPhase(0); setSeconds(4); setLeft(minutes * 60); };
  const choose = (m: number) => { setMinutes(m); setLeft(m * 60); };

  return <ScrollView contentContainerStyle={styles.container}>
    <Icon name="leaf-outline" size={32} color="#34d399" /><Text style={styles.title}>Box breathing</Text><Text style={styles.subtitle}>Follow a calm four-second rhythm.</Text>

    {finished ? <>
      <View style={styles.doneOrb}><Icon name="checkmark" size={46} color="#5eead4" /><Text style={styles.phase}>Well done</Text></View>
      {session.finishedId ? <FeedbackCard sessionId={session.finishedId} /> : null}
      <TouchableOpacity style={styles.secondary} onPress={again}><Icon name="refresh-outline" size={18} color="#e2e8f0" /><Text style={styles.secondaryText}>Breathe again</Text></TouchableOpacity>
    </> : <>
      {!started ? <View style={styles.lengths}>
        {LENGTHS.map((m) => <TouchableOpacity key={m} onPress={() => choose(m)} style={[styles.length, minutes === m && styles.lengthOn]} accessibilityRole="button" accessibilityState={{ selected: minutes === m }}>
          <Text style={[styles.lengthText, minutes === m && styles.lengthTextOn]}>{m} min</Text>
        </TouchableOpacity>)}
      </View> : <Text style={styles.remaining}>{clock(left)} left</Text>}
      <View style={[styles.orb, running && styles.orbActive]}><Text style={styles.phase}>{running ? PHASES[phase] : started ? 'Paused' : 'Ready'}</Text><Text style={styles.seconds}>{running ? seconds : '4'}</Text></View>
      <Text style={styles.helper}>Inhale 4 seconds, hold 4, exhale 4, then hold 4.</Text>
      <TouchableOpacity style={styles.button} onPress={toggle}><Icon name={running ? 'pause-outline' : 'play-outline'} size={20} color="#052e2b" /><Text style={styles.buttonText}>{running ? 'Pause' : started ? 'Resume' : 'Start session'}</Text></TouchableOpacity>
      {started ? <TouchableOpacity style={styles.secondary} onPress={end}><Icon name="checkmark-done-outline" size={18} color="#e2e8f0" /><Text style={styles.secondaryText}>Finish session</Text></TouchableOpacity> : null}
    </>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 28 }, title: { color: '#f8fafc', fontSize: 26, fontWeight: '700', marginTop: 14 }, subtitle: { color: '#94a3b8', marginTop: 8 }, orb: { width: 220, height: 220, borderRadius: 110, backgroundColor: '#1e3a3a', alignItems: 'center', justifyContent: 'center', marginVertical: 30, borderWidth: 2, borderColor: '#2dd4bf' }, orbActive: { backgroundColor: '#134e4a', transform: [{ scale: 1.04 }] }, phase: { color: '#ccfbf1', fontSize: 20, fontWeight: '700' }, seconds: { color: '#f8fafc', fontSize: 52, fontWeight: '700', marginTop: 8 }, helper: { color: '#94a3b8', textAlign: 'center', lineHeight: 21, maxWidth: 280 }, button: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#5eead4', borderRadius: 28, paddingVertical: 15, paddingHorizontal: 24, marginTop: 26 }, buttonText: { color: '#052e2b', fontWeight: '700', fontSize: 16 },
  lengths: { flexDirection: 'row', gap: 10, marginTop: 26 }, length: { borderWidth: 1, borderColor: '#334155', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 8 }, lengthOn: { backgroundColor: '#5eead4', borderColor: '#5eead4' }, lengthText: { color: '#cbd5e1', fontWeight: '700' }, lengthTextOn: { color: '#052e2b' },
  remaining: { color: '#94a3b8', fontWeight: '700', marginTop: 30, fontSize: 15 },
  doneOrb: { width: 180, height: 180, borderRadius: 90, backgroundColor: '#134e4a', alignItems: 'center', justifyContent: 'center', marginTop: 30, borderWidth: 2, borderColor: '#2dd4bf', gap: 6 },
  secondary: { flexDirection: 'row', gap: 8, alignItems: 'center', borderWidth: 1, borderColor: '#334155', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 20, marginTop: 14 }, secondaryText: { color: '#e2e8f0', fontWeight: '700' },
});
