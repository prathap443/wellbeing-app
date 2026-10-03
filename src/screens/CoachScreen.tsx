import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useSession } from '../lib/session';
import { Ionicons as Icon } from '@expo/vector-icons';
import {
  COACH_CONSENT_KEY, COACH_PROFILE_KEY, CoachError, CoachProfile, CoachSession, CoachTool, CoachTurn,
  FREE_DAILY_QUESTIONS, askCoach, fetchSuggestions, isCoachConfigured, loadSession, saveSession,
} from '../lib/coach';

type Option = { id: string; label: string };

const QUIZ: { key: keyof Omit<CoachProfile, 'name'>; title: string; hint: string; multi: boolean; options: Option[] }[] = [
  { key: 'focus', title: 'What would you like support with?', hint: 'Choose up to four.', multi: true, options: [
    { id: 'stress', label: 'Stress' }, { id: 'anxiety', label: 'Anxiety' }, { id: 'low_mood', label: 'Low mood' }, { id: 'sleep', label: 'Sleep' },
    { id: 'confidence', label: 'Confidence' }, { id: 'relationships', label: 'Relationships' }, { id: 'work_focus', label: 'Work and focus' }, { id: 'self_care', label: 'Self-care habits' },
  ] },
  { key: 'stressResponse', title: 'When things get stressful, you tend to…', hint: 'Pick the closest.', multi: false, options: [
    { id: 'overthink', label: 'Overthink' }, { id: 'withdraw', label: 'Pull away from people' }, { id: 'keep_busy', label: 'Keep busy' },
    { id: 'irritable', label: 'Get irritable' }, { id: 'shut_down', label: 'Shut down' },
  ] },
  { key: 'recharge', title: 'What helps you recharge?', hint: 'Choose any.', multi: true, options: [
    { id: 'alone_time', label: 'Time alone' }, { id: 'people', label: 'Being with people' }, { id: 'movement', label: 'Movement' },
    { id: 'nature', label: 'Nature' }, { id: 'creativity', label: 'Creativity' }, { id: 'rest', label: 'Rest' },
  ] },
  { key: 'style', title: 'How should your coach talk to you?', hint: 'You can change this later.', multi: false, options: [
    { id: 'gentle', label: 'Gentle and reassuring' }, { id: 'practical', label: 'Practical and direct' }, { id: 'reflective', label: 'Curious and reflective' },
  ] },
];

const TOOL_LINKS: Record<Exclude<CoachTool, 'none'>, { screen: string; label: string; icon: string }> = {
  breathe: { screen: 'Breathe', label: 'Try box breathing', icon: 'leaf-outline' },
  grounding: { screen: 'Grounding', label: 'Try a grounding exercise', icon: 'water-outline' },
  journal: { screen: 'Journal', label: 'Open your journal', icon: 'book-outline' },
  checkin: { screen: 'CheckIn', label: 'Do a quick check-in', icon: 'pulse-outline' },
  sleep_reset: { screen: 'SleepReset', label: 'Open sleep reset', icon: 'moon-outline' },
  reach_out: { screen: 'ReachOut', label: 'Reach out to someone', icon: 'chatbubble-ellipses-outline' },
  meditation: { screen: 'Meditation', label: 'Start a meditation', icon: 'headset-outline' },
  anxiety_support: { screen: 'AnxietySupport', label: 'Open anxiety support', icon: 'shield-outline' },
};

const ERROR_TEXT: Record<CoachError['code'], string> = {
  daily_limit: "You've used today's questions. Your coach will be ready again tomorrow.",
  too_many_refreshes: 'You have refreshed your questions a lot today. Try one of the questions above.',
  offline: 'Could not reach your coach. Check your connection and try again.',
  unavailable: 'Your coach is having trouble right now. Please try again in a moment.',
  not_configured: 'The coach is not available yet.',
};

export default function CoachScreen() {
  const navigation = useNavigation<any>();
  const { plus } = useSession();
  const scrollRef = useRef<ScrollView>(null);
  const scrollToTurn = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [consented, setConsented] = useState(false);
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [session, setSession] = useState<CoachSession | null>(null);
  const [loading, setLoading] = useState<'suggestions' | string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [[, consent], [, storedProfile]] = await AsyncStorage.multiGet([COACH_CONSENT_KEY, COACH_PROFILE_KEY]);
      setConsented(consent === 'true');
      // Ignore a saved profile that is incomplete (e.g. from an older version) and show the quiz again.
      const parsed = (() => { try { return storedProfile ? JSON.parse(storedProfile) : null; } catch { return null; } })();
      setProfile(parsed && Array.isArray(parsed.focus) && parsed.focus.length && typeof parsed.style === 'string' && typeof parsed.stressResponse === 'string'
        ? { ...parsed, recharge: Array.isArray(parsed.recharge) ? parsed.recharge : [] }
        : null);
      setSession(await loadSession());
      setReady(true);
    })();
  }, []);

  const update = useCallback(async (next: CoachSession) => {
    setSession(next);
    await saveSession(next);
  }, []);

  const loadSuggestions = useCallback(async (current: CoachSession, activeProfile: CoachProfile) => {
    setLoading('suggestions');
    setError(null);
    try {
      const { questions, remaining, limit } = await fetchSuggestions(activeProfile);
      await update({ ...current, suggestions: questions, remaining, limit });
    } catch (e) {
      setError(ERROR_TEXT[(e as CoachError).code ?? 'unavailable']);
    } finally {
      setLoading(null);
    }
  }, [update]);

  useEffect(() => {
    if (ready && consented && profile && !editingProfile && session && session.suggestions.length === 0 && session.turns.length === 0 && isCoachConfigured()) {
      loadSuggestions(session, profile);
    }
    // Only when the screen first becomes ready or the profile changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, consented, profile, editingProfile]);

  const ask = async (question: string) => {
    if (!profile || !session || loading) return;
    setLoading(question);
    setError(null);
    try {
      const turn = await askCoach(profile, question, session.turns);
      const { remaining, limit, ...rest } = turn;
      await update({ ...session, turns: [...session.turns, rest], suggestions: session.suggestions.filter((q) => q !== question), remaining, limit });
      // Scroll to the new answer once it has been laid out (see onLayout below).
      scrollToTurn.current = session.turns.length;
    } catch (e) {
      const err = e as CoachError;
      if (err.code === 'daily_limit') await update({ ...session, remaining: 0 });
      setError(ERROR_TEXT[err.code ?? 'unavailable']);
    } finally {
      setLoading(null);
    }
  };

  const acceptConsent = async () => {
    await AsyncStorage.setItem(COACH_CONSENT_KEY, 'true');
    setConsented(true);
  };

  const saveProfile = async (next: CoachProfile) => {
    await AsyncStorage.setItem(COACH_PROFILE_KEY, JSON.stringify(next));
    setProfile(next);
    setEditingProfile(false);
    if (session) {
      const fresh = { ...session, suggestions: [] };
      await update(fresh);
      if (session.turns.length > 0) loadSuggestions(fresh, next);
    }
  };

  if (!ready) return <View style={styles.center}><ActivityIndicator color="#34d399" /></View>;

  if (!isCoachConfigured()) {
    return <View style={styles.center}><Icon name="sparkles-outline" size={34} color="#34d399" /><Text style={styles.title}>Coming soon</Text><Text style={styles.subtitle}>Your personal wellbeing coach is on its way.</Text></View>;
  }

  if (!consented) return <Consent onAccept={acceptConsent} onDecline={() => navigation.goBack()} />;

  if (!profile || editingProfile) return <Quiz initial={profile} onDone={saveProfile} onCancel={profile ? () => setEditingProfile(false) : undefined} />;

  const limit = session?.limit ?? FREE_DAILY_QUESTIONS;
  const remaining = session?.remaining ?? limit;
  const latest = session?.turns[session.turns.length - 1];
  const outOfQuestions = remaining <= 0;

  const questionChip = (question: string) => (
    <TouchableOpacity key={question} style={[styles.chip, (outOfQuestions || !!loading) && styles.chipDisabled]} disabled={outOfQuestions || !!loading} onPress={() => ask(question)} accessibilityRole="button">
      {loading === question ? <ActivityIndicator size="small" color="#34d399" /> : <Icon name="chatbubble-outline" size={16} color="#34d399" />}
      <Text style={styles.chipText}>{question}</Text>
    </TouchableOpacity>
  );

  return <ScrollView ref={scrollRef} contentContainerStyle={styles.container}>
    <View style={styles.headerRow}>
      <View style={styles.badge}><Icon name="sparkles" size={20} color="#bbf7d0" /></View>
      <View style={styles.headerText}><Text style={styles.heading}>{profile.name ? `Hi ${profile.name}` : 'Your coach'}</Text><Text style={styles.headerSub}>Questions picked for you</Text></View>
      <View style={[styles.quota, outOfQuestions && styles.quotaEmpty]}><Text style={styles.quotaText}>{remaining}/{limit} left</Text></View>
    </View>

    {session?.turns.map((turn, index) => <View key={`${turn.question}-${index}`} onLayout={(e) => {
      if (scrollToTurn.current === index) {
        scrollToTurn.current = null;
        scrollRef.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - 12), animated: true });
      }
    }}>
      <View style={styles.questionBubble}><Text style={styles.questionText}>{turn.question}</Text></View>
      <View style={styles.answerCard}>
        <Text style={styles.answerText}>{turn.answer}</Text>
        {turn.tool !== 'none' && TOOL_LINKS[turn.tool] ? <TouchableOpacity style={styles.toolButton} onPress={() => navigation.navigate(TOOL_LINKS[turn.tool as Exclude<CoachTool, 'none'>].screen)}>
          <Icon name={TOOL_LINKS[turn.tool as Exclude<CoachTool, 'none'>].icon as any} size={18} color="#052e2b" /><Text style={styles.toolText}>{TOOL_LINKS[turn.tool as Exclude<CoachTool, 'none'>].label}</Text>
        </TouchableOpacity> : null}
      </View>
      {turn.safety !== 'none' ? <SafetyCard crisis={turn.safety === 'crisis'} onPress={() => navigation.navigate('SupportGuidance')} /> : null}
    </View>)}

    {loading && loading !== 'suggestions' ? <View style={styles.thinking}><ActivityIndicator color="#34d399" /><Text style={styles.thinkingText}>Your coach is thinking…</Text></View> : null}

    {latest && latest.followUps.length > 0 && !loading ? <>
      <Text style={styles.sectionTitle}>Go deeper</Text>
      {latest.followUps.map(questionChip)}
    </> : null}

    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{session?.turns.length ? 'Other questions for you' : 'Questions for you'}</Text>
      <TouchableOpacity onPress={() => session && loadSuggestions(session, profile)} disabled={!!loading} accessibilityLabel="Refresh questions"><Icon name="refresh-outline" size={20} color="#64748b" /></TouchableOpacity>
    </View>
    {loading === 'suggestions' ? <View style={styles.thinking}><ActivityIndicator color="#34d399" /><Text style={styles.thinkingText}>Finding questions for you…</Text></View> : null}
    {session?.suggestions.map(questionChip)}

    {error ? <View style={styles.errorCard}><Icon name="information-circle-outline" size={20} color="#fcd34d" /><Text style={styles.errorText}>{error}</Text></View> : null}
    {outOfQuestions && !error ? <View style={styles.errorCard}><Icon name="moon-outline" size={20} color="#fcd34d" /><Text style={styles.errorText}>{ERROR_TEXT.daily_limit}</Text></View> : null}
    {outOfQuestions && !plus ? <TouchableOpacity style={styles.upsell} onPress={() => navigation.navigate('Subscription')} accessibilityRole="button">
      <Icon name="sparkles" size={20} color="#422006" />
      <View style={styles.upsellBody}><Text style={styles.upsellTitle}>Keep talking with Wellbeing Plus</Text><Text style={styles.upsellText}>Up to 30 coach questions every day.</Text></View>
      <Icon name="chevron-forward-outline" size={18} color="#422006" />
    </TouchableOpacity> : null}

    <TouchableOpacity style={styles.editLink} onPress={() => setEditingProfile(true)}><Icon name="options-outline" size={16} color="#94a3b8" /><Text style={styles.editText}>Update what I want help with</Text></TouchableOpacity>
    <View style={styles.footer}>
      <Text style={styles.footerText}>Your coach is an AI. It can make mistakes and is not a therapist or crisis service.</Text>
      <TouchableOpacity onPress={() => navigation.navigate('SupportGuidance')}><Text style={styles.footerLink}>Need help now?</Text></TouchableOpacity>
    </View>
  </ScrollView>;
}

function SafetyCard({ crisis, onPress }: { crisis: boolean; onPress: () => void }) {
  return <TouchableOpacity style={[styles.safety, crisis && styles.safetyCrisis]} onPress={onPress} accessibilityRole="button">
    <Icon name="heart" size={20} color={crisis ? '#4c0519' : '#fecdd3'} />
    <View style={styles.safetyBody}>
      <Text style={[styles.safetyTitle, crisis && styles.safetyTitleCrisis]}>{crisis ? 'Talk to someone now' : 'You deserve more support'}</Text>
      <Text style={[styles.safetyText, crisis && styles.safetyTextCrisis]}>{crisis ? 'Tap to see crisis lines you can call or text right now, for free.' : 'A GP or mental health professional can help alongside this app. Tap for support options.'}</Text>
    </View>
  </TouchableOpacity>;
}

function Consent({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  return <ScrollView contentContainerStyle={styles.container}>
    <View style={styles.badge}><Icon name="sparkles" size={20} color="#bbf7d0" /></View>
    <Text style={styles.title}>Meet your AI coach</Text>
    <Text style={styles.subtitle}>Get personal guidance based on how you have been feeling. Just tap a question; there is nothing to type.</Text>
    {[
      ['person-outline', 'Personal to you', 'Questions are picked from your answers to a few quick choices and your recent moods.'],
      ['cloud-outline', 'What is shared', 'To answer, your choices, recent mood ratings and check-in scores are sent to our server and to Anthropic, who provide the Claude AI model. Your notes, journal and contacts are never sent.'],
      ['eye-off-outline', 'Not stored by us', 'We do not keep your questions or answers on our server or link them to you. Anthropic may keep requests for a limited time for safety.'],
      ['medkit-outline', 'Not a therapist', 'The coach is an AI. It can make mistakes and cannot provide crisis care or diagnosis.'],
      ['gift-outline', `${FREE_DAILY_QUESTIONS} free questions a day`, 'Your allowance resets daily. Wellbeing Plus members get up to 30.'],
    ].map(([icon, title, body]) => <View key={title} style={styles.point}><Icon name={icon as any} size={22} color="#34d399" /><View style={styles.pointBody}><Text style={styles.pointTitle}>{title}</Text><Text style={styles.pointText}>{body}</Text></View></View>)}
    <TouchableOpacity style={styles.primary} onPress={onAccept} accessibilityRole="button"><Text style={styles.primaryText}>Agree and continue</Text></TouchableOpacity>
    <TouchableOpacity style={styles.secondary} onPress={onDecline}><Text style={styles.secondaryText}>Not now</Text></TouchableOpacity>
  </ScrollView>;
}

function Quiz({ initial, onDone, onCancel }: { initial: CoachProfile | null; onDone: (p: CoachProfile) => void; onCancel?: () => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({
    focus: initial?.focus ?? [], stressResponse: initial ? [initial.stressResponse] : [], recharge: initial?.recharge ?? [], style: initial ? [initial.style] : [],
  });
  const [name, setName] = useState(initial?.name ?? '');
  const isNameStep = step === QUIZ.length;
  const current = QUIZ[step];

  const toggle = (id: string) => {
    const selected = answers[current.key];
    const next = current.multi
      ? selected.includes(id) ? selected.filter((v) => v !== id) : current.key === 'focus' && selected.length >= 4 ? selected : [...selected, id]
      : [id];
    setAnswers({ ...answers, [current.key]: next });
  };

  const canContinue = isNameStep || current.key === 'recharge' || answers[current.key].length > 0;

  const next = () => {
    if (!isNameStep) { setStep(step + 1); return; }
    onDone({ name: name.trim() || undefined, focus: answers.focus, stressResponse: answers.stressResponse[0], recharge: answers.recharge, style: answers.style[0] });
  };

  return <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    <View style={styles.progress}>{[...QUIZ, null].map((_, i) => <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />)}</View>
    {isNameStep ? <>
      <Text style={styles.title}>What should your coach call you?</Text>
      <Text style={styles.subtitle}>Optional. Your first name or a nickname.</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="First name" placeholderTextColor="#64748b" maxLength={30} autoCapitalize="words" returnKeyType="done" />
    </> : <>
      <Text style={styles.title}>{current.title}</Text>
      <Text style={styles.subtitle}>{current.hint}</Text>
      <View style={styles.options}>{current.options.map((option) => {
        const selected = answers[current.key].includes(option.id);
        return <TouchableOpacity key={option.id} style={[styles.option, selected && styles.optionSelected]} onPress={() => toggle(option.id)} accessibilityRole={current.multi ? 'checkbox' : 'radio'} accessibilityState={{ checked: selected }}>
          <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option.label}</Text>
        </TouchableOpacity>;
      })}</View>
    </>}
    <TouchableOpacity style={[styles.primary, !canContinue && styles.primaryDisabled]} disabled={!canContinue} onPress={next}><Text style={styles.primaryText}>{isNameStep ? 'Meet my coach' : 'Continue'}</Text></TouchableOpacity>
    {step > 0 ? <TouchableOpacity style={styles.secondary} onPress={() => setStep(step - 1)}><Text style={styles.secondaryText}>Back</Text></TouchableOpacity>
      : onCancel ? <TouchableOpacity style={styles.secondary} onPress={onCancel}><Text style={styles.secondaryText}>Cancel</Text></TouchableOpacity> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 20, paddingBottom: 48 },
  center: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 28 },
  badge: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#134e4a', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#f8fafc', fontSize: 24, fontWeight: '800', marginTop: 16, textAlign: 'left' },
  subtitle: { color: '#94a3b8', lineHeight: 21, marginTop: 8, marginBottom: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }, headerText: { flex: 1 },
  heading: { color: '#f8fafc', fontSize: 20, fontWeight: '800' }, headerSub: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  quota: { backgroundColor: '#134e4a', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 }, quotaEmpty: { backgroundColor: '#78350f' }, quotaText: { color: '#d1fae5', fontSize: 12, fontWeight: '700' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  sectionTitle: { color: '#cbd5e1', fontSize: 13, fontWeight: '700', letterSpacing: 0.3, marginTop: 18, marginBottom: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 14, padding: 14, marginBottom: 9 },
  chipDisabled: { opacity: 0.5 }, chipText: { color: '#f1f5f9', fontSize: 14, lineHeight: 19, flex: 1 },
  questionBubble: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: '#065f46', borderRadius: 16, borderBottomRightRadius: 4, padding: 12, marginTop: 8 },
  questionText: { color: '#ecfdf5', fontSize: 14, lineHeight: 19 },
  answerCard: { backgroundColor: '#1e293b', borderRadius: 16, borderBottomLeftRadius: 4, padding: 16, marginTop: 10, marginRight: 24 },
  answerText: { color: '#e2e8f0', fontSize: 15, lineHeight: 23 },
  toolButton: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 8, backgroundColor: '#5eead4', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, marginTop: 14 },
  toolText: { color: '#052e2b', fontWeight: '700', fontSize: 13 },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }, thinkingText: { color: '#94a3b8' },
  safety: { flexDirection: 'row', gap: 12, backgroundColor: '#4c1d2b', borderRadius: 14, padding: 14, marginTop: 10 }, safetyCrisis: { backgroundColor: '#fda4af' },
  safetyBody: { flex: 1 }, safetyTitle: { color: '#ffe4e6', fontWeight: '800' }, safetyTitleCrisis: { color: '#4c0519' },
  safetyText: { color: '#fecdd3', fontSize: 13, lineHeight: 18, marginTop: 3 }, safetyTextCrisis: { color: '#4c0519' },
  errorCard: { flexDirection: 'row', gap: 10, backgroundColor: '#422006', borderRadius: 12, padding: 13, marginTop: 12 }, errorText: { color: '#fde68a', flex: 1, lineHeight: 19, fontSize: 13 },
  upsell: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fbbf24', borderRadius: 14, padding: 14, marginTop: 12 }, upsellBody: { flex: 1 }, upsellTitle: { color: '#422006', fontWeight: '800' }, upsellText: { color: '#713f12', fontSize: 12, marginTop: 2 },
  editLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 26 }, editText: { color: '#94a3b8', fontSize: 13 },
  footer: { borderTopWidth: 1, borderTopColor: '#1e293b', marginTop: 20, paddingTop: 16, alignItems: 'center' },
  footerText: { color: '#64748b', fontSize: 12, textAlign: 'center', lineHeight: 17 }, footerLink: { color: '#fda4af', fontWeight: '700', marginTop: 8, fontSize: 13 },
  point: { flexDirection: 'row', gap: 14, marginBottom: 16 }, pointBody: { flex: 1 }, pointTitle: { color: '#f8fafc', fontWeight: '700', fontSize: 15 }, pointText: { color: '#94a3b8', lineHeight: 20, marginTop: 3, fontSize: 13 },
  primary: { backgroundColor: '#10b981', borderRadius: 26, paddingVertical: 15, alignItems: 'center', marginTop: 22 }, primaryDisabled: { backgroundColor: '#334155' }, primaryText: { color: '#022c22', fontWeight: '800', fontSize: 16 },
  secondary: { alignItems: 'center', padding: 14 }, secondaryText: { color: '#94a3b8', fontWeight: '600' },
  progress: { flexDirection: 'row', gap: 6 }, progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#334155' }, progressDotActive: { backgroundColor: '#34d399' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: { borderWidth: 1, borderColor: '#334155', backgroundColor: '#1e293b', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11 },
  optionSelected: { backgroundColor: '#10b981', borderColor: '#10b981' }, optionText: { color: '#e2e8f0', fontWeight: '600' }, optionTextSelected: { color: '#022c22' },
  input: { backgroundColor: '#1e293b', color: '#f8fafc', borderColor: '#334155', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 50, fontSize: 16 },
});
