import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons as Icon } from '@expo/vector-icons';

type Action = { id: string; text: string; done: boolean };
type TherapyPlan = { topic: string; questions: string; actions: Action[]; draft?: string };
const KEY = 'therapy_companion_plan';
// Input limits. The backup importer accepts at least this much, so anything typed here always restores.
export const NOTE_MAX = 10000;
export const ACTION_MAX = 500;

export default function TherapyCompanionScreen() {
  const [topic, setTopic] = useState('');
  const [questions, setQuestions] = useState('');
  const [actions, setActions] = useState<TherapyPlan['actions']>([]);
  const [actionText, setActionText] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [status, setStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [removed, setRemoved] = useState<{ action: Action; index: number } | null>(null);
  // Notes saved before the limits existed may be longer: never cut them short.
  const [limits, setLimits] = useState({ topic: NOTE_MAX, questions: NOTE_MAX });
  const writeSeq = useRef(0);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(KEY);
        if (stored) {
          try {
            const plan: Partial<TherapyPlan> = JSON.parse(stored);
            const t = typeof plan.topic === 'string' ? plan.topic : '';
            const q = typeof plan.questions === 'string' ? plan.questions : '';
            setTopic(t); setQuestions(q);
            setActions(Array.isArray(plan.actions) ? plan.actions.filter((a) => a && typeof a.id === 'string' && typeof a.text === 'string') : []);
            setActionText(typeof plan.draft === 'string' ? plan.draft : '');
            setLimits({ topic: Math.max(NOTE_MAX, t.length), questions: Math.max(NOTE_MAX, q.length) });
          } catch {
            // Unreadable notes: keep a copy before anything is saved over them, rather than overwrite silently.
            await AsyncStorage.setItem(`${KEY}_unreadable`, stored).catch(() => undefined);
          }
        }
      } catch {
        // Storage unavailable: start empty; saving will report its own result.
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, []);

  // Autosave every change (including the unsent action draft), and show the real result.
  // Waits for the initial load so an empty first render never overwrites the saved plan.
  const save = useCallback(async (plan: TherapyPlan) => {
    const seq = ++writeSeq.current;
    // Only show "Saving…" if a write is noticeably slow, so typing doesn't make the status flicker.
    const slow = setTimeout(() => { if (seq === writeSeq.current) setStatus('saving'); }, 400);
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(plan));
      if (seq === writeSeq.current) setStatus('saved');
    } catch {
      if (seq === writeSeq.current) setStatus('error');
    } finally {
      clearTimeout(slow);
    }
  }, []);
  useEffect(() => {
    if (!loaded) return;
    save({ topic, questions, actions, draft: actionText });
  }, [loaded, topic, questions, actions, actionText, save]);
  const retry = () => save({ topic, questions, actions, draft: actionText });

  const addAction = () => {
    const text = actionText.trim();
    if (!text) return;
    const next = [...actions, { id: `${Date.now()}`, text, done: false }];
    setActions(next); setActionText('');
  };
  const toggleAction = (id: string) => { const next = actions.map((action) => action.id === id ? { ...action, done: !action.done } : action); setActions(next); };
  // Deleting shows Undo for a few seconds instead of being instantly permanent.
  const removeAction = (id: string) => {
    const index = actions.findIndex((a) => a.id === id);
    if (index < 0) return;
    setRemoved({ action: actions[index], index });
    setActions(actions.filter((a) => a.id !== id));
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setRemoved(null), 6000);
  };
  const undoRemove = () => {
    if (!removed) return;
    const next = [...actions];
    next.splice(Math.min(removed.index, next.length), 0, removed.action);
    setActions(next); setRemoved(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  };
  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);
  // After a session: clear the prep notes and finished actions; unfinished actions carry over.
  const hasSomethingToClear = topic.trim().length > 0 || questions.trim().length > 0 || actions.some((action) => action.done);
  const startNextSession = () => { setTopic(''); setQuestions(''); setActions(actions.filter((action) => !action.done)); setConfirmReset(false); };

  return <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><Icon name="people-outline" size={31} color="#60a5fa" /><Text style={styles.title}>Therapy companion</Text><Text style={styles.subtitle}>Prepare for sessions and keep small, agreed actions visible between them.</Text></View>
    <View style={styles.boundary}><Icon name="shield-checkmark-outline" size={20} color="#93c5fd" /><Text style={styles.boundaryText}>This is a private planning tool. It does not provide therapy, diagnosis, crisis support, or share anything with a therapist.</Text></View>
    <Text style={styles.sectionTitle}>Prepare for your next session</Text>
    <View style={styles.card}><Text style={styles.label}>What would you like to talk about?</Text><TextInput style={styles.largeInput} value={topic} onChangeText={setTopic} maxLength={limits.topic} placeholder="A situation, pattern, or goal you want to explore" placeholderTextColor="#64748b" multiline textAlignVertical="top" /><Text style={styles.label}>Questions for your therapist</Text><TextInput style={styles.smallInput} value={questions} onChangeText={setQuestions} maxLength={limits.questions} placeholder="For example: What could I try when this feeling appears?" placeholderTextColor="#64748b" multiline textAlignVertical="top" /></View>
    <Text style={styles.sectionTitle}>Between-session actions</Text><Text style={styles.sectionHint}>Keep these small and agreed with your therapist.</Text>
    <View style={styles.actionInputRow}><TextInput style={styles.actionInput} value={actionText} onChangeText={setActionText} maxLength={ACTION_MAX} placeholder="Add one small action" placeholderTextColor="#64748b" onSubmitEditing={addAction} /><TouchableOpacity style={styles.addButton} onPress={addAction}><Icon name="add-outline" size={22} color="#fff" /></TouchableOpacity></View>
    {actions.length === 0 ? <Text style={styles.empty}>No actions yet. Start with one realistic step.</Text> : actions.map((action) => <View key={action.id} style={styles.actionRow}><TouchableOpacity onPress={() => toggleAction(action.id)}><Icon name={action.done ? 'checkmark-circle' : 'ellipse-outline'} size={25} color={action.done ? '#34d399' : '#64748b'} /></TouchableOpacity><Text style={[styles.actionText, action.done && styles.actionDone]}>{action.text}</Text><TouchableOpacity onPress={() => removeAction(action.id)}><Icon name="close-outline" size={20} color="#94a3b8" /></TouchableOpacity></View>)}
    {removed ? <View style={styles.undoBar} accessibilityLiveRegion="polite">
      <Text style={styles.undoText} numberOfLines={1}>Removed "{removed.action.text}"</Text>
      <TouchableOpacity onPress={undoRemove} accessibilityRole="button"><Text style={styles.undoButton}>Undo</Text></TouchableOpacity>
    </View> : null}
    {status === 'error' ? <View style={styles.savedRow} accessibilityLiveRegion="assertive">
      <Icon name="alert-circle-outline" size={16} color="#fca5a5" /><Text style={styles.errorText}>Couldn't save on this device.</Text>
      <TouchableOpacity onPress={retry} accessibilityRole="button"><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
    </View> : <View style={styles.savedRow}>
      <Icon name={status === 'saving' ? 'time-outline' : 'checkmark-circle-outline'} size={16} color="#6ee7b7" />
      <Text style={styles.savedText}>{status === 'saving' ? 'Saving…' : 'Saved automatically on this device'}</Text>
    </View>}
    {hasSomethingToClear ? (confirmReset ? <View style={styles.resetCard}>
      <Text style={styles.resetTitle}>Start your next session?</Text>
      <Text style={styles.resetText}>This clears your topic, questions and completed actions. Unfinished actions stay.</Text>
      <View style={styles.resetButtons}>
        <TouchableOpacity style={styles.resetCancel} onPress={() => setConfirmReset(false)}><Text style={styles.resetCancelText}>Keep notes</Text></TouchableOpacity>
        <TouchableOpacity style={styles.resetConfirm} onPress={startNextSession}><Text style={styles.resetConfirmText}>Start fresh</Text></TouchableOpacity>
      </View>
    </View> : <TouchableOpacity style={styles.resetButton} onPress={() => setConfirmReset(true)} accessibilityRole="button">
      <Icon name="refresh-outline" size={18} color="#93c5fd" /><Text style={styles.resetButtonText}>Start next session</Text>
    </TouchableOpacity>) : null}
    <View style={styles.tip}><Icon name="bulb-outline" size={20} color="#fde68a" /><Text style={styles.tipText}>A helpful starting point: describe what happened, how it affected you, and what support would feel useful.</Text></View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 20, paddingBottom: 40 }, header: { marginBottom: 22 }, title: { color: '#f8fafc', fontSize: 26, fontWeight: '700', marginTop: 12 }, subtitle: { color: '#94a3b8', lineHeight: 21, marginTop: 7 },
  boundary: { flexDirection: 'row', gap: 10, backgroundColor: '#172554', borderRadius: 14, borderWidth: 1, borderColor: '#1d4ed8', padding: 15 }, boundaryText: { color: '#bfdbfe', fontSize: 12, lineHeight: 18, flex: 1 }, sectionTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '700', marginTop: 25, marginBottom: 8 }, sectionHint: { color: '#94a3b8', fontSize: 12, marginBottom: 12 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16 }, label: { color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginBottom: 8 }, largeInput: { minHeight: 100, color: '#f8fafc', borderColor: '#334155', borderWidth: 1, borderRadius: 12, padding: 13, marginBottom: 17 }, smallInput: { minHeight: 78, color: '#f8fafc', borderColor: '#334155', borderWidth: 1, borderRadius: 12, padding: 13 },
  actionInputRow: { flexDirection: 'row', gap: 10 }, actionInput: { flex: 1, backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, borderRadius: 12, color: '#f8fafc', paddingHorizontal: 14 }, addButton: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' }, empty: { color: '#64748b', textAlign: 'center', marginVertical: 20 }, actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1e293b', borderRadius: 13, padding: 14, marginTop: 10 }, actionText: { color: '#e2e8f0', flex: 1, fontSize: 14 }, actionDone: { color: '#6ee7b7', textDecorationLine: 'line-through' },
  saveButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#2563eb', borderRadius: 26, paddingVertical: 15, marginTop: 24 }, saveText: { color: '#fff', fontWeight: '700', fontSize: 16 }, resetButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#334155', borderRadius: 24, paddingVertical: 13, marginTop: 14 }, resetButtonText: { color: '#93c5fd', fontWeight: '700' },
  resetCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginTop: 14 }, resetTitle: { color: '#f8fafc', fontWeight: '800', fontSize: 15 }, resetText: { color: '#94a3b8', fontSize: 13, lineHeight: 19, marginTop: 6 },
  resetButtons: { flexDirection: 'row', gap: 10, marginTop: 14 }, resetCancel: { flex: 1, borderWidth: 1, borderColor: '#334155', borderRadius: 20, paddingVertical: 12, alignItems: 'center' }, resetCancelText: { color: '#e2e8f0', fontWeight: '700' },
  resetConfirm: { flex: 1, backgroundColor: '#2563eb', borderRadius: 20, paddingVertical: 12, alignItems: 'center' }, resetConfirmText: { color: '#fff', fontWeight: '800' },
  savedRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 22 }, savedText: { color: '#94a3b8', fontSize: 13 },
  errorText: { color: '#fca5a5', fontSize: 13 }, retryText: { color: '#93c5fd', fontWeight: '800', fontSize: 13, marginLeft: 4 },
  undoBar: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#334155', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginTop: 12 },
  undoText: { color: '#e2e8f0', flex: 1, fontSize: 13 }, undoButton: { color: '#93c5fd', fontWeight: '800' }, tip: { flexDirection: 'row', gap: 10, backgroundColor: '#78350f', borderRadius: 14, padding: 15, marginTop: 16 }, tipText: { color: '#fef3c7', flex: 1, fontSize: 12, lineHeight: 18 },
});
