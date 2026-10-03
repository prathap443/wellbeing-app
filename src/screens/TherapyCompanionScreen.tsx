import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons as Icon } from '@expo/vector-icons';

type TherapyPlan = { topic: string; questions: string; actions: Array<{ id: string; text: string; done: boolean }> };

export default function TherapyCompanionScreen() {
  const [topic, setTopic] = useState('');
  const [questions, setQuestions] = useState('');
  const [actions, setActions] = useState<TherapyPlan['actions']>([]);
  const [actionText, setActionText] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem('therapy_companion_plan');
        if (stored) {
          const plan: Partial<TherapyPlan> = JSON.parse(stored);
          setTopic(plan.topic || ''); setQuestions(plan.questions || ''); setActions(Array.isArray(plan.actions) ? plan.actions : []);
        }
      } catch {
        // Corrupt saved value: start empty rather than crash.
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, []);

  // Autosave every change. Waits for the initial load so an empty first render never overwrites the saved plan.
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem('therapy_companion_plan', JSON.stringify({ topic, questions, actions })).catch(() => undefined);
  }, [loaded, topic, questions, actions]);

  const addAction = () => {
    const text = actionText.trim();
    if (!text) return;
    const next = [...actions, { id: `${Date.now()}`, text, done: false }];
    setActions(next); setActionText('');
  };
  const toggleAction = (id: string) => { const next = actions.map((action) => action.id === id ? { ...action, done: !action.done } : action); setActions(next); };
  const removeAction = (id: string) => { const next = actions.filter((action) => action.id !== id); setActions(next); };
  // After a session: clear the prep notes and finished actions; unfinished actions carry over.
  const hasSomethingToClear = topic.trim().length > 0 || questions.trim().length > 0 || actions.some((action) => action.done);
  const startNextSession = () => { setTopic(''); setQuestions(''); setActions(actions.filter((action) => !action.done)); setConfirmReset(false); };

  return <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><Icon name="people-outline" size={31} color="#60a5fa" /><Text style={styles.title}>Therapy companion</Text><Text style={styles.subtitle}>Prepare for sessions and keep small, agreed actions visible between them.</Text></View>
    <View style={styles.boundary}><Icon name="shield-checkmark-outline" size={20} color="#93c5fd" /><Text style={styles.boundaryText}>This is a private planning tool. It does not provide therapy, diagnosis, crisis support, or share anything with a therapist.</Text></View>
    <Text style={styles.sectionTitle}>Prepare for your next session</Text>
    <View style={styles.card}><Text style={styles.label}>What would you like to talk about?</Text><TextInput style={styles.largeInput} value={topic} onChangeText={setTopic} placeholder="A situation, pattern, or goal you want to explore" placeholderTextColor="#64748b" multiline textAlignVertical="top" /><Text style={styles.label}>Questions for your therapist</Text><TextInput style={styles.smallInput} value={questions} onChangeText={setQuestions} placeholder="For example: What could I try when this feeling appears?" placeholderTextColor="#64748b" multiline textAlignVertical="top" /></View>
    <Text style={styles.sectionTitle}>Between-session actions</Text><Text style={styles.sectionHint}>Keep these small and agreed with your therapist.</Text>
    <View style={styles.actionInputRow}><TextInput style={styles.actionInput} value={actionText} onChangeText={setActionText} placeholder="Add one small action" placeholderTextColor="#64748b" onSubmitEditing={addAction} /><TouchableOpacity style={styles.addButton} onPress={addAction}><Icon name="add-outline" size={22} color="#fff" /></TouchableOpacity></View>
    {actions.length === 0 ? <Text style={styles.empty}>No actions yet. Start with one realistic step.</Text> : actions.map((action) => <View key={action.id} style={styles.actionRow}><TouchableOpacity onPress={() => toggleAction(action.id)}><Icon name={action.done ? 'checkmark-circle' : 'ellipse-outline'} size={25} color={action.done ? '#34d399' : '#64748b'} /></TouchableOpacity><Text style={[styles.actionText, action.done && styles.actionDone]}>{action.text}</Text><TouchableOpacity onPress={() => removeAction(action.id)}><Icon name="close-outline" size={20} color="#94a3b8" /></TouchableOpacity></View>)}
    <View style={styles.savedRow}><Icon name="checkmark-circle-outline" size={16} color="#6ee7b7" /><Text style={styles.savedText}>Saved automatically on this device</Text></View>
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
  savedRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 22 }, savedText: { color: '#94a3b8', fontSize: 13 }, tip: { flexDirection: 'row', gap: 10, backgroundColor: '#78350f', borderRadius: 14, padding: 15, marginTop: 16 }, tipText: { color: '#fef3c7', flex: 1, fontSize: 12, lineHeight: 18 },
});
