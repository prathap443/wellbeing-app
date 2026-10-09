import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useSession } from '../lib/session';
import { GENERAL_SAFETY, RITUAL_STEPS, TEAS } from '../lib/teas';
import { useActivitySession } from '../lib/useActivitySession';
import FeedbackCard from '../components/FeedbackCard';

type Stage = 'about' | 'brewing' | 'ritual' | 'done';
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function TeaScreen() {
  const navigation = useNavigation<any>();
  const { id } = (useRoute<any>().params ?? {}) as { id?: string };
  const tea = TEAS.find((t) => t.id === id);
  const { plus } = useSession();
  const [stage, setStage] = useState<Stage>('about');
  const [left, setLeft] = useState(0);
  const [step, setStep] = useState(0);
  const session = useActivitySession('tea');

  useEffect(() => { if (tea && !tea.free && !plus) navigation.replace('Subscription'); }, [tea?.id, plus]); // eslint-disable-line react-hooks/exhaustive-deps
  // Brew countdown, based on the clock so it stays right even if the screen sleeps.
  useEffect(() => {
    if (stage !== 'brewing' || !tea) return;
    const endAt = Date.now() + tea.brew.minutes * 60_000;
    const tick = () => setLeft(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [stage, tea]);

  if (!tea) return <View style={[styles.page, styles.center]}><Text style={styles.body}>This tea isn't available.</Text></View>;

  const startBrew = () => { session.begin(); setStage('brewing'); };
  const nextStep = () => { if (step < RITUAL_STEPS.length - 1) setStep(step + 1); else { session.finish(); setStage('done'); } };
  const again = () => { setStage('about'); setStep(0); };

  return <ScrollView style={styles.page} contentContainerStyle={styles.container}>
    <Image source={tea.image} style={styles.hero} resizeMode="cover" accessibilityIgnoresInvertColors />
    <Text style={styles.title}>{tea.title}</Text>
    <Text style={styles.tagline}>{tea.tagline}</Text>

    {stage === 'about' ? <>
      <Text style={styles.body}>{tea.about}</Text>
      <View style={styles.evidence}>
        <View style={styles.badge}><Icon name={tea.evidence === 'Some small studies' ? 'flask-outline' : 'leaf-outline'} size={14} color="#0f172a" /><Text style={styles.badgeText}>Evidence: {tea.evidence.toLowerCase()}</Text></View>
        <Text style={styles.evidenceText}>{tea.evidenceNote}</Text>
      </View>
      <Text style={styles.section}>How to brew</Text>
      <Text style={styles.body}>{tea.brew.amount}. {tea.brew.water}. Steep for about {tea.brew.minutes} minutes.</Text>
      <Text style={styles.section}>Good to know</Text>
      {[...tea.safety, ...GENERAL_SAFETY].map((line) => <View key={line} style={styles.safetyRow}><Icon name="alert-circle-outline" size={16} color="#fcd34d" /><Text style={styles.safetyText}>{line}</Text></View>)}
      <TouchableOpacity style={styles.primary} onPress={startBrew} accessibilityRole="button"><Icon name="timer-outline" size={20} color="#052e2b" /><Text style={styles.primaryText}>I've poured the water: start the timer</Text></TouchableOpacity>
    </> : null}

    {stage === 'brewing' ? <View style={styles.panel}>
      <Text style={styles.big}>{left > 0 ? clock(left) : 'Ready'}</Text>
      <Text style={styles.body}>{left > 0 ? 'While it steeps, watch the colour slowly change. Breathe in for four, out for six.' : 'Your tea is ready. Remove the tea bag or strain it, and let it cool for a moment.'}</Text>
      <TouchableOpacity style={styles.primary} onPress={() => setStage('ritual')} accessibilityRole="button"><Text style={styles.primaryText}>{left > 0 ? 'Skip ahead: my tea is ready' : 'Begin the ritual'}</Text></TouchableOpacity>
    </View> : null}

    {stage === 'ritual' ? <View style={styles.panel}>
      <Text style={styles.stepCount}>{step + 1} of {RITUAL_STEPS.length}</Text>
      <Text style={styles.stepTitle}>{RITUAL_STEPS[step].title}</Text>
      <Text style={styles.stepText}>{RITUAL_STEPS[step].text}</Text>
      <TouchableOpacity style={styles.primary} onPress={nextStep} accessibilityRole="button"><Text style={styles.primaryText}>{step < RITUAL_STEPS.length - 1 ? 'Next' : 'Finish'}</Text></TouchableOpacity>
    </View> : null}

    {stage === 'done' ? <View style={styles.panel}>
      <Icon name="checkmark-circle-outline" size={36} color="#5eead4" />
      <Text style={styles.stepTitle}>A quiet five minutes</Text>
      <Text style={styles.body}>Finish your tea slowly, and carry a little of this pace into what comes next.</Text>
      {session.finishedId ? <FeedbackCard key={session.finishedId} sessionId={session.finishedId} /> : null}
      <TouchableOpacity style={styles.secondary} onPress={again} accessibilityRole="button"><Text style={styles.secondaryText}>Back to {tea.title}</Text></TouchableOpacity>
    </View> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0f172a' },
  center: { alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, paddingBottom: 48, width: '100%', maxWidth: 620, alignSelf: 'center' },
  hero: { width: '100%', height: 300, borderRadius: 22 },
  title: { color: '#f8fafc', fontSize: 28, fontWeight: '800', marginTop: 18 },
  tagline: { color: '#cbd5e1', fontSize: 15, marginTop: 4 },
  body: { color: '#cbd5e1', fontSize: 15, lineHeight: 22, marginTop: 12 },
  evidence: { backgroundColor: '#1e293b', borderRadius: 14, padding: 14, marginTop: 16 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#5eead4', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#0f172a', fontWeight: '800', fontSize: 12 },
  evidenceText: { color: '#cbd5e1', fontSize: 13, lineHeight: 19, marginTop: 8 },
  section: { color: '#f8fafc', fontSize: 17, fontWeight: '800', marginTop: 22 },
  safetyRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  safetyText: { color: '#e2e8f0', fontSize: 14, lineHeight: 20, flex: 1 },
  primary: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#5eead4', borderRadius: 26, paddingVertical: 15, paddingHorizontal: 20, marginTop: 24 },
  primaryText: { color: '#052e2b', fontWeight: '800', fontSize: 15, textAlign: 'center' },
  secondary: { alignItems: 'center', borderWidth: 1, borderColor: '#334155', borderRadius: 24, paddingVertical: 12, marginTop: 16, alignSelf: 'stretch' },
  secondaryText: { color: '#e2e8f0', fontWeight: '700' },
  panel: { backgroundColor: '#1e293b', borderRadius: 20, padding: 22, marginTop: 20, alignItems: 'center' },
  big: { color: '#f8fafc', fontSize: 54, fontWeight: '800' },
  stepCount: { color: '#94a3b8', fontWeight: '700' },
  stepTitle: { color: '#f8fafc', fontSize: 22, fontWeight: '800', marginTop: 8, textAlign: 'center' },
  stepText: { color: '#e2e8f0', fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 10 },
});
