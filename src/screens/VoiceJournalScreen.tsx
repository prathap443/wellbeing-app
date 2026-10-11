import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { JOURNAL_FEELINGS, JOURNAL_FIELD_MAX, TOOL_FEELING, loadJournal, newEntryId, ownWords, saveJournal, type JournalEntry } from '../lib/journal';
import { MAX_LISTEN_MS, needsSupport } from '../lib/voice';
import { useVoiceCapture } from '../lib/useVoiceCapture';

// "Say what's on your mind, then choose one helpful next step."
// Speak (or type) -> feelings (optional) -> Talk it through / Take a short pause / Just save -> gentle close.
// Everything stays on this phone. Nothing here is sent to the AI coach or our server.

type Step = 'speak' | 'feel' | 'choose' | 'talk' | 'pause' | 'done';
type Field = 'situation' | 'more' | 'perspective' | 'nextStep' | 'extra';

const firstQuestion = (feelings: string[]) =>
  feelings.includes('Stressed') ? 'What feels most stressful right now?'
  : feelings.includes('Anxious') ? 'What are you worried might happen?'
  : feelings.includes('Low') ? "What's weighing on you most?"
  : feelings.includes('Frustrated') ? "What's getting in the way?"
  : 'What feels most important about this right now?';

const QUESTIONS: { field: 'more' | 'perspective' | 'nextStep'; prompt: (f: string[]) => string; helper: string }[] = [
  { field: 'more', prompt: firstQuestion, helper: 'Say as much or as little as you like.' },
  { field: 'perspective', prompt: () => 'What would you say to a friend who felt this way?', helper: 'A kinder, fairer view can make things feel more manageable.' },
  { field: 'nextStep', prompt: () => 'Would you like to choose one manageable next step?', helper: 'Something small and realistic. Or skip this.' },
];

const mmss = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export default function VoiceJournalScreen() {
  const navigation = useNavigation<any>();
  const voice = useVoiceCapture();
  const [step, setStep] = useState<Step>('speak');
  const [text, setText] = useState({ situation: '', more: '', perspective: '', nextStep: '', extra: '' });
  const [feelings, setFeelings] = useState<string[]>([]);
  const [q, setQ] = useState(0);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [addingMore, setAddingMore] = useState(false);
  const [extraSaved, setExtraSaved] = useState(false);
  const [support, setSupport] = useState(false);
  const supportShown = useRef(false);
  const savedRef = useRef(false);
  // Earlier reflections, read once, only to show the person's own kinder words back to them.
  const [past, setPast] = useState<JournalEntry[]>([]);
  useEffect(() => { loadJournal().then((r) => { if (r.ok) setPast(r.entries); }).catch(() => undefined); }, []);
  const words = ownWords(past, feelings);
  savedRef.current = !!savedId;

  const set = (field: Field, value: string) => setText((t) => ({ ...t, [field]: value.slice(0, JOURNAL_FIELD_MAX) }));
  const allText = () => [text.situation, text.more, text.perspective, text.nextStep, text.extra].join(' ');

  // Show the support card once, when something said or typed suggests the person may be at risk.
  const checkSupport = (value = allText()) => {
    if (!supportShown.current && needsSupport(value)) { supportShown.current = true; setSupport(true); }
  };
  useEffect(() => { if (!voice.listening) checkSupport(); }, [voice.listening]); // eslint-disable-line react-hooks/exhaustive-deps

  // Leaving before saving: confirm, so spoken words aren't lost by a stray swipe.
  useEffect(() => navigation.addListener('beforeRemove', (e: any) => {
    if (savedRef.current || !(text.situation.trim() || text.more.trim())) return;
    e.preventDefault();
    Alert.alert('Leave without saving?', 'What you said will not be kept.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
    ]);
  }), [navigation, text.situation, text.more]);

  const mic = (field: Field) => (voice.listening ? voice.stop() : voice.start(text[field], (t) => set(field, t)));

  const save = async (override: Partial<typeof text> = {}): Promise<string | null> => {
    if (savedId) return savedId;
    const t = { ...text, ...override };
    setSaving(true); setSaveError(false);
    const result = await loadJournal();
    if (!result.ok) { setSaving(false); setSaveError(true); return null; } // never overwrite reflections we couldn't read
    const entry: JournalEntry = {
      id: newEntryId(), createdAt: new Date().toISOString(), date: new Date().toLocaleDateString(),
      situation: [t.situation.trim(), t.more.trim()].filter(Boolean).join('\n\n'), feelings, thought: '', perspective: t.perspective.trim(), nextStep: t.nextStep.trim(), source: 'voice',
    };
    try { await saveJournal([entry, ...result.entries]); setSavedId(entry.id!); setSaving(false); return entry.id!; }
    catch { setSaving(false); setSaveError(true); return null; }
  };

  const saveExtra = async () => {
    const extra = text.extra.trim();
    if (!extra || !savedId) return;
    setSaving(true); setSaveError(false);
    const result = await loadJournal();
    if (!result.ok) { setSaving(false); setSaveError(true); return; }
    const next = result.entries.map((e) => (e.id === savedId ? { ...e, situation: [e.situation, extra].filter(Boolean).join('\n\n') } : e));
    try { await saveJournal(next); setExtraSaved(true); setAddingMore(false); set('extra', ''); } catch { setSaveError(true); }
    setSaving(false);
  };

  const next = async (to: Step) => { voice.stop(); checkSupport(); setStep(to); };
  const justSave = async () => { voice.stop(); checkSupport(); if (await save()) setStep('done'); };
  const toPause = async () => { voice.stop(); checkSupport(); if (await save()) setStep('pause'); };
  const finishTalk = async (override: Partial<typeof text> = {}) => { voice.stop(); checkSupport(); if (await save(override)) setStep('done'); };
  const toolFeeling = feelings.map((f) => TOOL_FEELING[f]).find(Boolean);

  const micRow = (field: Field, placeholder: string, big = false) => <>
    {voice.support.ok ? <View style={styles.micRow}>
      <TouchableOpacity onPress={() => mic(field)} disabled={voice.starting} style={[styles.mic, big && styles.micBig, voice.listening && styles.micOn]} accessibilityRole="button" accessibilityLabel={voice.listening ? 'Stop recording' : 'Start speaking'}>
        {voice.starting ? <ActivityIndicator color="#fff" /> : <Icon name={voice.listening ? 'stop' : 'mic'} size={big ? 34 : 22} color="#fff" />}
      </TouchableOpacity>
      <Text style={styles.micHint}>{voice.listening ? `Listening… ${mmss(voice.elapsedMs)} / ${mmss(MAX_LISTEN_MS)}. Tap to stop.` : voice.starting ? 'Starting…' : 'Tap to speak, or type below.'}</Text>
    </View> : <View style={styles.notice}><Icon name="information-circle-outline" size={18} color="#93c5fd" /><Text style={styles.noticeText}>{voice.support.reason === 'platform' ? 'Voice entry works in the iPhone app. You can type here instead.' : "Voice entry isn't available on this iPhone for its language, so nothing is recorded. You can type instead."}</Text></View>}
    {voice.error ? <View style={styles.notice}><Icon name="alert-circle-outline" size={18} color="#fca5a5" /><Text style={styles.noticeText}>{voice.error}</Text></View> : null}
    <TextInput style={[styles.input, big && styles.inputBig]} value={text[field]} onChangeText={(v) => set(field, v)} editable={!voice.listening} multiline maxLength={JOURNAL_FIELD_MAX} placeholder={placeholder} placeholderTextColor="#64748b" />
  </>;

  const saveErrorBox = () => (saveError ? <View style={styles.notice}><Icon name="alert-circle-outline" size={18} color="#fca5a5" /><Text style={styles.noticeText}>Couldn't save. Your words are still here. Please try again.</Text></View> : null);

  return <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    {step === 'speak' ? <>
      <Text style={styles.title}>Say what's on your mind</Text>
      <Text style={styles.subtitle}>Speak freely, then edit the words if you like. The audio isn't kept, and nothing leaves your phone.</Text>
      {micRow('situation', 'Your words will appear here. You can also type.', true)}
      <TouchableOpacity style={[styles.primary, !text.situation.trim() && styles.disabled]} disabled={!text.situation.trim() || voice.listening} onPress={() => next('feel')} accessibilityRole="button"><Text style={styles.primaryText}>Next</Text></TouchableOpacity>
    </> : null}

    {step === 'feel' ? <>
      <Text style={styles.title}>How are you feeling?</Text>
      <Text style={styles.subtitle}>Choose any that fit, or skip.</Text>
      <View style={styles.chips}>{JOURNAL_FEELINGS.map((f) => <TouchableOpacity key={f} onPress={() => setFeelings((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]))} style={[styles.chip, feelings.includes(f) && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: feelings.includes(f) }}><Text style={[styles.chipText, feelings.includes(f) && styles.chipTextOn]}>{f}</Text></TouchableOpacity>)}</View>
      <TouchableOpacity style={styles.primary} onPress={() => next('choose')} accessibilityRole="button"><Text style={styles.primaryText}>{feelings.length ? 'Next' : 'Skip'}</Text></TouchableOpacity>
      <TouchableOpacity style={styles.link} onPress={() => setStep('speak')}><Text style={styles.linkText}>Back to my words</Text></TouchableOpacity>
    </> : null}

    {step === 'choose' ? <>
      <Text style={styles.title}>What would help right now?</Text>
      <View style={styles.quote}><Text style={styles.quoteText} numberOfLines={6}>“{text.situation.trim()}”</Text></View>
      {words ? <View style={styles.words}>
        <Text style={styles.wordsLabel}>YOUR OWN WORDS</Text>
        <Text style={styles.wordsIntro}>Last time you felt {words.feeling.toLowerCase()}, you told yourself:</Text>
        <Text style={styles.wordsText}>“{words.text}”</Text>
      </View> : null}
      {[
        { icon: 'chatbubbles-outline', title: 'Talk it through', text: 'A few gentle questions, one at a time. Speak or type.', onPress: () => { setQ(0); next('talk'); } },
        { icon: 'leaf-outline', title: 'Take a short pause', text: 'Saves your words, then a breathing or grounding exercise.', onPress: toPause },
        { icon: 'bookmark-outline', title: 'Just save', text: 'Keep it as it is. Nothing else needed.', onPress: justSave },
      ].map((o) => <TouchableOpacity key={o.title} style={styles.option} onPress={o.onPress} disabled={saving} accessibilityRole="button">
        <View style={styles.optionIcon}><Icon name={o.icon as any} size={22} color="#c4b5fd" /></View>
        <View style={{ flex: 1 }}><Text style={styles.optionTitle}>{o.title}</Text><Text style={styles.optionText}>{o.text}</Text></View>
        <Icon name="chevron-forward" size={18} color="#64748b" />
      </TouchableOpacity>)}
      {saving ? <ActivityIndicator color="#c4b5fd" style={{ marginTop: 10 }} /> : null}
      {saveErrorBox()}
    </> : null}

    {step === 'talk' ? <>
      <Text style={styles.progress}>Question {q + 1} of {QUESTIONS.length}</Text>
      <Text style={styles.title}>{QUESTIONS[q].prompt(feelings)}</Text>
      <Text style={styles.subtitle}>{QUESTIONS[q].helper}</Text>
      {QUESTIONS[q].field === 'perspective' && words && !text.perspective.trim() ? <View style={styles.words}>
        <Text style={styles.wordsIntro}>Last time you felt {words.feeling.toLowerCase()}, you told yourself:</Text>
        <Text style={styles.wordsText}>“{words.text}”</Text>
        <TouchableOpacity onPress={() => set('perspective', words.text)} accessibilityRole="button"><Text style={styles.wordsUse}>Use these words again</Text></TouchableOpacity>
      </View> : null}
      {micRow(QUESTIONS[q].field, 'Speak or type, or skip.')}
      <View style={styles.row}>
        <TouchableOpacity style={styles.secondary} disabled={voice.listening || saving} onPress={() => { const field = QUESTIONS[q].field; set(field, ''); if (q < QUESTIONS.length - 1) { voice.stop(); setQ(q + 1); } else finishTalk({ [field]: '' }); }}><Text style={styles.secondaryText}>Skip</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.primary, styles.flex]} disabled={voice.listening || saving} onPress={() => { if (q < QUESTIONS.length - 1) { voice.stop(); checkSupport(); setQ(q + 1); } else finishTalk(); }} accessibilityRole="button">
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{q < QUESTIONS.length - 1 ? 'Next' : 'Finish and save'}</Text>}
        </TouchableOpacity>
      </View>
      {q < QUESTIONS.length - 1 ? <TouchableOpacity style={styles.link} onPress={() => finishTalk()} disabled={voice.listening || saving}><Text style={styles.linkText}>Save and finish now</Text></TouchableOpacity> : null}
      {saveErrorBox()}
    </> : null}

    {step === 'pause' ? <>
      <View style={styles.savedRow}><Icon name="checkmark-circle" size={20} color="#6ee7b7" /><Text style={styles.savedText}>Saved privately on this phone.</Text></View>
      <Text style={styles.title}>Take a short pause</Text>
      <Text style={styles.subtitle}>Choose what feels right. Afterwards you can say how you feel.</Text>
      {[
        { icon: 'ellipse-outline', title: 'Breathe for 1 minute', route: 'Breathe', params: { feeling: toolFeeling, minutes: 1 } },
        { icon: 'hand-left-outline', title: 'Grounding: 5-4-3-2-1', route: 'Grounding', params: { feeling: toolFeeling } },
        { icon: 'play-circle-outline', title: "Today's pause video", route: 'Pause', params: {} },
      ].map((o) => <TouchableOpacity key={o.title} style={styles.option} onPress={() => { setStep('done'); navigation.navigate(o.route, o.params); }} accessibilityRole="button">
        <View style={styles.optionIcon}><Icon name={o.icon as any} size={22} color="#6ee7b7" /></View>
        <Text style={[styles.optionTitle, { flex: 1 }]}>{o.title}</Text>
        <Icon name="chevron-forward" size={18} color="#64748b" />
      </TouchableOpacity>)}
      <TouchableOpacity style={styles.link} onPress={() => setStep('done')}><Text style={styles.linkText}>Not now</Text></TouchableOpacity>
    </> : null}

    {step === 'done' ? <>
      <View style={styles.savedRow}><Icon name="checkmark-circle" size={20} color="#6ee7b7" /><Text style={styles.savedText}>{extraSaved ? 'Added to your reflection.' : 'Saved privately on this phone.'}</Text></View>
      {text.nextStep.trim() ? <View style={styles.stepCard}>
        <Text style={styles.stepLabel}>YOUR NEXT STEP</Text>
        <Text style={styles.stepText}>{text.nextStep.trim()}</Text>
        <Text style={styles.stepHint}>It will wait for you on Home for the next few days, until you mark it done.</Text>
        <TouchableOpacity style={styles.plannerButton} onPress={() => navigation.push('Planner', { prefillTask: text.nextStep.trim().slice(0, 300) })} accessibilityRole="button"><Icon name="calendar-outline" size={16} color="#052e2b" /><Text style={styles.plannerText}>Add to planner</Text></TouchableOpacity>
        <TouchableOpacity style={styles.habitButton} onPress={() => navigation.push('Goals', { newHabit: text.nextStep.trim().slice(0, 60) })} accessibilityRole="button"><Icon name="repeat-outline" size={16} color="#fde68a" /><Text style={styles.habitText}>Make it a habit</Text></TouchableOpacity>
      </View> : null}
      {addingMore ? <>
        <Text style={styles.title}>Anything else?</Text>
        {micRow('extra', 'Speak or type.')}
        <TouchableOpacity style={[styles.primary, !text.extra.trim() && styles.disabled]} disabled={!text.extra.trim() || voice.listening || saving} onPress={() => { checkSupport(); saveExtra(); }}><Text style={styles.primaryText}>Add to reflection</Text></TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => { voice.stop(); setAddingMore(false); set('extra', ''); }}><Text style={styles.linkText}>Cancel</Text></TouchableOpacity>
        {saveErrorBox()}
      </> : <>
        <Text style={styles.title}>Would you like to add anything else, or leave it here?</Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.secondary, styles.flex]} onPress={() => { setExtraSaved(false); setAddingMore(true); }}><Text style={styles.secondaryText}>Add something</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.primary, styles.flex]} onPress={() => navigation.goBack()} accessibilityRole="button"><Text style={styles.primaryText}>Leave it here</Text></TouchableOpacity>
        </View>
      </>}
    </> : null}

    <Modal visible={support} transparent animationType="fade" onRequestClose={() => setSupport(false)}>
      <View style={styles.backdrop}><View style={styles.supportCard}>
        <Icon name="heart" size={26} color="#fda4af" />
        <Text style={styles.supportTitle}>You don't have to handle this alone</Text>
        <Text style={styles.supportText}>If you're thinking about harming yourself or ending your life, please talk to someone now. If you're in immediate danger, call your local emergency number.</Text>
        <TouchableOpacity style={styles.helpButton} onPress={() => { setSupport(false); navigation.navigate('SupportGuidance'); }} accessibilityRole="button"><Text style={styles.helpText}>Get help now</Text></TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => setSupport(false)}><Text style={styles.linkText}>Continue</Text></TouchableOpacity>
        <Text style={styles.supportNote}>This check happens only on your phone. Nothing is sent or shared.</Text>
      </View></View>
    </Modal>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 20, paddingBottom: 40 },
  title: { color: '#f8fafc', fontSize: 22, fontWeight: '700', lineHeight: 29, marginTop: 6 },
  subtitle: { color: '#94a3b8', lineHeight: 21, marginTop: 8 },
  progress: { color: '#c4b5fd', fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  micRow: { alignItems: 'center', marginTop: 22, gap: 10 },
  mic: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  micBig: { width: 88, height: 88, borderRadius: 44 },
  micOn: { backgroundColor: '#e11d48' },
  micHint: { color: '#94a3b8', fontSize: 13, textAlign: 'center' },
  input: { minHeight: 96, backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, borderRadius: 14, padding: 14, color: '#f8fafc', fontSize: 15, lineHeight: 22, textAlignVertical: 'top', marginTop: 16 },
  inputBig: { minHeight: 150 },
  notice: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#1e293b', borderRadius: 12, padding: 12, marginTop: 14 },
  noticeText: { color: '#cbd5e1', fontSize: 13, lineHeight: 19, flex: 1 },
  primary: { backgroundColor: '#8b5cf6', borderRadius: 25, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  secondary: { borderColor: '#475569', borderWidth: 1, borderRadius: 25, paddingVertical: 14, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  secondaryText: { color: '#cbd5e1', fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10 }, flex: { flex: 1 },
  link: { alignSelf: 'center', padding: 12, marginTop: 6 }, linkText: { color: '#c4b5fd', fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  chip: { borderColor: '#475569', borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  chipOn: { backgroundColor: '#6d28d9', borderColor: '#8b5cf6' },
  chipText: { color: '#94a3b8', fontWeight: '700' }, chipTextOn: { color: '#fff' },
  quote: { backgroundColor: '#1e293b', borderRadius: 14, padding: 14, marginTop: 14, marginBottom: 6 },
  quoteText: { color: '#e2e8f0', fontStyle: 'italic', lineHeight: 21 },
  words: { backgroundColor: '#24203f', borderRadius: 14, padding: 14, marginTop: 12 },
  wordsLabel: { color: '#c4b5fd', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  wordsIntro: { color: '#cbd5e1' }, wordsText: { color: '#f8fafc', fontSize: 15, lineHeight: 22, fontStyle: 'italic', marginTop: 6 },
  wordsUse: { color: '#c4b5fd', fontWeight: '700', marginTop: 10 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginTop: 10 },
  optionIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
  optionTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700' }, optionText: { color: '#94a3b8', fontSize: 13, lineHeight: 18, marginTop: 3 },
  savedRow: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#12372f', borderRadius: 12, padding: 12, marginBottom: 14 },
  savedText: { color: '#a7f3d0', fontWeight: '600' },
  stepCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16 },
  stepLabel: { color: '#6ee7b7', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  stepHint: { color: '#94a3b8', fontSize: 12, lineHeight: 17, marginTop: 6 },
  stepText: { color: '#f8fafc', fontSize: 16, lineHeight: 23, marginTop: 8 },
  habitButton: { flexDirection: 'row', gap: 6, alignSelf: 'flex-start', alignItems: 'center', borderColor: '#f59e0b', borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, marginTop: 8 }, habitText: { color: '#fde68a', fontWeight: '700' },
  plannerButton: { flexDirection: 'row', gap: 6, alignSelf: 'flex-start', alignItems: 'center', backgroundColor: '#6ee7b7', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, marginTop: 12 },
  plannerText: { color: '#052e2b', fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(2,6,23,0.8)', justifyContent: 'center', padding: 22 },
  supportCard: { backgroundColor: '#1e293b', borderRadius: 20, padding: 22, alignItems: 'center', maxWidth: 440, width: '100%', alignSelf: 'center' },
  supportTitle: { color: '#f8fafc', fontSize: 19, fontWeight: '800', textAlign: 'center', marginTop: 10 },
  supportText: { color: '#cbd5e1', lineHeight: 21, textAlign: 'center', marginTop: 10 },
  helpButton: { backgroundColor: '#fda4af', borderRadius: 24, paddingVertical: 14, alignSelf: 'stretch', alignItems: 'center', marginTop: 18 },
  helpText: { color: '#4c0519', fontWeight: '800', fontSize: 16 },
  supportNote: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 4 },
});
