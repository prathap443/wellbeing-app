import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useState } from 'react';
import { Ionicons as Icon } from '@expo/vector-icons';

const STEPS = [
  { count: '5', title: 'See', text: 'Name five things you can see around you.' },
  { count: '4', title: 'Feel', text: 'Notice four things you can physically feel.' },
  { count: '3', title: 'Hear', text: 'Listen for three sounds, near or far.' },
  { count: '2', title: 'Smell', text: 'Identify two scents, or two smells you would enjoy.' },
  { count: '1', title: 'Taste', text: 'Notice one taste in your mouth, or imagine a comforting one.' },
];

export default function GroundingScreen() {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const complete = step === STEPS.length - 1;

  return <View style={styles.container}>
    <Icon name="water-outline" size={30} color="#60a5fa" />
    <Text style={styles.title}>5-4-3-2-1 grounding</Text>
    <Text style={styles.subtitle}>Bring attention back to the present, one sense at a time.</Text>
    <View style={styles.progress}>{STEPS.map((_, index) => <View key={index} style={[styles.progressDot, index <= step && styles.progressDotActive]} />)}</View>
    <View style={styles.card}><Text style={styles.count}>{current.count}</Text><Text style={styles.cardTitle}>{current.title}</Text><Text style={styles.cardText}>{current.text}</Text></View>
    <TouchableOpacity style={styles.button} onPress={() => complete ? setStep(0) : setStep(step + 1)}><Text style={styles.buttonText}>{complete ? 'Start again' : 'Next step'}</Text><Icon name={complete ? 'refresh-outline' : 'arrow-forward-outline'} size={20} color="#082f49" /></TouchableOpacity>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 28 }, title: { color: '#f8fafc', fontSize: 26, fontWeight: '700', marginTop: 14 }, subtitle: { color: '#94a3b8', textAlign: 'center', lineHeight: 21, marginTop: 8, maxWidth: 310 }, progress: { flexDirection: 'row', gap: 10, marginTop: 34 }, progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#334155' }, progressDotActive: { backgroundColor: '#60a5fa' }, card: { width: '100%', backgroundColor: '#172554', borderRadius: 20, padding: 28, alignItems: 'center', marginVertical: 28 }, count: { color: '#93c5fd', fontSize: 64, fontWeight: '700' }, cardTitle: { color: '#f8fafc', fontSize: 24, fontWeight: '700', marginTop: 6 }, cardText: { color: '#bfdbfe', textAlign: 'center', lineHeight: 23, fontSize: 16, marginTop: 14 }, button: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#7dd3fc', borderRadius: 28, paddingHorizontal: 24, paddingVertical: 15 }, buttonText: { color: '#082f49', fontWeight: '700', fontSize: 16 },
});
