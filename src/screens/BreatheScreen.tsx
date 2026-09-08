import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { Ionicons as Icon } from '@expo/vector-icons';

const PHASES = ['Breathe in', 'Hold', 'Breathe out', 'Hold'];

export default function BreatheScreen() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [seconds, setSeconds] = useState(4);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setSeconds((current) => {
      if (current > 1) return current - 1;
      setPhase((currentPhase) => (currentPhase + 1) % PHASES.length);
      return 4;
    }), 1000);
    return () => clearInterval(timer);
  }, [running]);

  return <View style={styles.container}>
    <Icon name="leaf-outline" size={32} color="#34d399" /><Text style={styles.title}>Box breathing</Text><Text style={styles.subtitle}>Follow a calm four-second rhythm.</Text>
    <View style={[styles.orb, running && styles.orbActive]}><Text style={styles.phase}>{running ? PHASES[phase] : 'Ready'}</Text><Text style={styles.seconds}>{running ? seconds : '4'}</Text></View>
    <Text style={styles.helper}>Inhale 4 seconds, hold 4, exhale 4, then hold 4.</Text>
    <TouchableOpacity style={styles.button} onPress={() => setRunning((current) => !current)}><Icon name={running ? 'pause-outline' : 'play-outline'} size={20} color="#052e2b" /><Text style={styles.buttonText}>{running ? 'Pause session' : 'Start session'}</Text></TouchableOpacity>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 28 }, title: { color: '#f8fafc', fontSize: 26, fontWeight: '700', marginTop: 14 }, subtitle: { color: '#94a3b8', marginTop: 8 }, orb: { width: 220, height: 220, borderRadius: 110, backgroundColor: '#1e3a3a', alignItems: 'center', justifyContent: 'center', marginVertical: 42, borderWidth: 2, borderColor: '#2dd4bf' }, orbActive: { backgroundColor: '#134e4a', transform: [{ scale: 1.04 }] }, phase: { color: '#ccfbf1', fontSize: 20, fontWeight: '700' }, seconds: { color: '#f8fafc', fontSize: 52, fontWeight: '700', marginTop: 8 }, helper: { color: '#94a3b8', textAlign: 'center', lineHeight: 21, maxWidth: 280 }, button: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#5eead4', borderRadius: 28, paddingVertical: 15, paddingHorizontal: 24, marginTop: 26 }, buttonText: { color: '#052e2b', fontWeight: '700', fontSize: 16 },
});
