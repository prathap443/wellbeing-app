import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';

const POINTS = [
  { icon: 'happy-outline', title: 'Check in with yourself', text: 'Log your mood, sleep and energy in seconds and spot patterns over time.' },
  { icon: 'leaf-outline', title: 'Tools for hard moments', text: 'Breathing, grounding, meditation, journaling and an anxiety reset.' },
  { icon: 'lock-closed-outline', title: 'Private by design', text: 'Your moods and journal stay on this device. No ads, no tracking. The AI coach and accounts are optional.' },
];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  return <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.badge}><Icon name="sparkles-outline" size={28} color="#bbf7d0" /></View>
      <Text style={styles.title}>Welcome to Wellbeing</Text>
      <Text style={styles.subtitle}>A calm, private space to notice how you feel and take small steps that help.</Text>
      {POINTS.map((point) => <View key={point.title} style={styles.point}>
        <Icon name={point.icon as any} size={24} color="#34d399" />
        <View style={styles.pointText}><Text style={styles.pointTitle}>{point.title}</Text><Text style={styles.pointBody}>{point.text}</Text></View>
      </View>)}
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Before you start</Text>
        <Text style={styles.noticeText}>Wellbeing supports self-care. It is not a medical device and does not provide diagnosis, treatment or crisis care. If you are in danger or thinking about harming yourself, tap "Get help" on the home screen or call your local emergency number.</Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={onDone} accessibilityRole="button"><Text style={styles.buttonText}>I understand, let's begin</Text></TouchableOpacity>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' }, container: { flexGrow: 1, padding: 24, paddingBottom: 40, justifyContent: 'center' },
  badge: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#134e4a', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#f8fafc', fontSize: 30, fontWeight: '800', marginTop: 20 }, subtitle: { color: '#94a3b8', fontSize: 16, lineHeight: 23, marginTop: 10, marginBottom: 26 },
  point: { flexDirection: 'row', gap: 14, marginBottom: 20 }, pointText: { flex: 1 }, pointTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700' }, pointBody: { color: '#94a3b8', lineHeight: 20, marginTop: 4 },
  notice: { backgroundColor: '#1e293b', borderRadius: 16, padding: 18, marginTop: 8 }, noticeTitle: { color: '#fecdd3', fontWeight: '700', fontSize: 15 }, noticeText: { color: '#cbd5e1', lineHeight: 20, marginTop: 6, fontSize: 13 },
  button: { backgroundColor: '#10b981', borderRadius: 28, paddingVertical: 16, alignItems: 'center', marginTop: 26 }, buttonText: { color: '#022c22', fontWeight: '800', fontSize: 16 },
});
