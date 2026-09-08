import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons as Icon } from '@expo/vector-icons';

type JournalEntry = {
  date: string;
  text?: string;
  situation?: string;
  feelings?: string[];
  thought?: string;
  perspective?: string;
  nextStep?: string;
};

const PROMPTS = [
  'What happened, without judging it?',
  'What feeling needs some space today?',
  'What would make today one percent easier?',
  'What is one thing you handled well?',
];
const FEELINGS = ['Calm', 'Hopeful', 'Stressed', 'Low', 'Anxious', 'Frustrated'];

export default function JournalScreen() {
  const [situation, setSituation] = useState('');
  const [thought, setThought] = useState('');
  const [perspective, setPerspective] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [feelings, setFeelings] = useState<string[]>([]);
  const [promptIndex, setPromptIndex] = useState(0);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    const loadEntries = async () => {
      const stored = await AsyncStorage.getItem('journal_entries');
      if (stored) setEntries(JSON.parse(stored));
    };
    loadEntries();
  }, []);

  const toggleFeeling = (feeling: string) => setFeelings((current) => current.includes(feeling) ? current.filter((item) => item !== feeling) : [...current, feeling]);

  const clearForm = () => {
    setSituation('');
    setThought('');
    setPerspective('');
    setNextStep('');
    setFeelings([]);
  };

  const saveEntry = async () => {
    if (!situation.trim() && !thought.trim()) {
      Alert.alert('Start with one thought', 'Write what happened or what is on your mind.');
      return;
    }
    const entry: JournalEntry = {
      date: new Date().toLocaleDateString(),
      situation: situation.trim(),
      feelings,
      thought: thought.trim(),
      perspective: perspective.trim(),
      nextStep: nextStep.trim(),
    };
    const updated = [entry, ...entries].slice(0, 100);
    await AsyncStorage.setItem('journal_entries', JSON.stringify(updated));
    setEntries(updated);
    clearForm();
    setSavedMessage('Reflection saved privately on this device.');
  };

  const summary = (entry: JournalEntry) => entry.situation || entry.thought || entry.text || 'Reflection saved';

  return <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><Icon name="book-outline" size={30} color="#c4b5fd" /><Text style={styles.title}>Reflect with clarity</Text><Text style={styles.subtitle}>Name what is happening, create space around it, and choose one gentle next step.</Text></View>
    <View style={styles.promptCard}><View style={styles.promptTop}><Text style={styles.promptLabel}>GUIDED REFLECTION</Text><TouchableOpacity onPress={() => setPromptIndex((promptIndex + 1) % PROMPTS.length)}><Icon name="refresh-outline" size={19} color="#c4b5fd" /></TouchableOpacity></View><Text style={styles.prompt}>{PROMPTS[promptIndex]}</Text></View>
    <Text style={styles.sectionTitle}>1. What happened?</Text><TextInput style={styles.shortInput} value={situation} onChangeText={setSituation} placeholder="Describe the situation or moment" placeholderTextColor="#64748b" multiline />
    <Text style={styles.sectionTitle}>2. What are you feeling?</Text><View style={styles.feelings}>{FEELINGS.map((feeling) => <TouchableOpacity key={feeling} onPress={() => toggleFeeling(feeling)} style={[styles.feelingChip, feelings.includes(feeling) && styles.feelingChipSelected]}><Text style={[styles.feelingText, feelings.includes(feeling) && styles.feelingTextSelected]}>{feeling}</Text></TouchableOpacity>)}</View>
    <Text style={styles.sectionTitle}>3. What is your mind saying?</Text><TextInput style={styles.shortInput} value={thought} onChangeText={setThought} placeholder="For example: 'I am going to mess this up'" placeholderTextColor="#64748b" multiline />
    <View style={styles.reframeCard}><View style={styles.reframeHeading}><Icon name="heart-outline" size={20} color="#f0abfc" /><Text style={styles.reframeTitle}>A more balanced perspective</Text></View><Text style={styles.helper}>What would you say to a friend in this exact situation?</Text><TextInput style={styles.reframeInput} value={perspective} onChangeText={setPerspective} placeholder="Write a fairer, kinder response" placeholderTextColor="#a78bfa" multiline /></View>
    <Text style={styles.sectionTitle}>4. One small next step</Text><TextInput style={styles.shortInput} value={nextStep} onChangeText={setNextStep} placeholder="Something realistic you can do next" placeholderTextColor="#64748b" />
    <View style={styles.actions}><TouchableOpacity style={styles.clearButton} onPress={clearForm}><Text style={styles.clearText}>Clear</Text></TouchableOpacity><TouchableOpacity style={styles.saveButton} onPress={saveEntry}><Icon name="save-outline" size={19} color="#fff" /><Text style={styles.saveText}>Save reflection</Text></TouchableOpacity></View>
    {savedMessage ? <View style={styles.saved}><Icon name="checkmark-circle-outline" size={20} color="#a7f3d0" /><Text style={styles.savedText}>{savedMessage}</Text></View> : null}
    <Text style={styles.recent}>Recent reflections</Text>
    {entries.length === 0 ? <Text style={styles.empty}>Your reflections will appear here.</Text> : entries.slice(0, 4).map((entry, index) => <View key={`${entry.date}-${index}`} style={styles.entry}><View style={styles.entryTop}><Text style={styles.entryDate}>{entry.date}</Text>{entry.feelings?.length ? <Text style={styles.entryFeelings}>{entry.feelings.join(' · ')}</Text> : null}</View><Text style={styles.entryText} numberOfLines={3}>{summary(entry)}</Text>{entry.nextStep ? <Text style={styles.entryStep}>Next: {entry.nextStep}</Text> : null}</View>)}
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 20, paddingBottom: 40 }, header: { marginBottom: 24 }, title: { color: '#f8fafc', fontSize: 26, fontWeight: '700', marginTop: 12 }, subtitle: { color: '#94a3b8', lineHeight: 21, marginTop: 7 },
  promptCard: { backgroundColor: '#312e4d', borderRadius: 17, padding: 18 }, promptTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, promptLabel: { color: '#c4b5fd', fontSize: 11, fontWeight: '800', letterSpacing: 1 }, prompt: { color: '#f8fafc', fontSize: 17, lineHeight: 24, marginTop: 11 }, sectionTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700', marginTop: 23, marginBottom: 9 },
  shortInput: { minHeight: 68, backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, borderRadius: 14, padding: 14, color: '#f8fafc', lineHeight: 20, textAlignVertical: 'top' }, feelings: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, feelingChip: { borderColor: '#475569', borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 }, feelingChipSelected: { backgroundColor: '#6d28d9', borderColor: '#8b5cf6' }, feelingText: { color: '#94a3b8', fontSize: 12, fontWeight: '700' }, feelingTextSelected: { color: '#fff' },
  reframeCard: { backgroundColor: '#4a1d45', borderRadius: 16, padding: 16, marginTop: 22 }, reframeHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 }, reframeTitle: { color: '#fce7f3', fontSize: 16, fontWeight: '700' }, helper: { color: '#f0abfc', fontSize: 12, lineHeight: 18, marginTop: 8 }, reframeInput: { minHeight: 70, backgroundColor: 'rgba(76,29,72,0.7)', borderColor: '#86198f', borderWidth: 1, borderRadius: 12, padding: 12, color: '#fce7f3', marginTop: 12, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22 }, clearButton: { width: 86, borderColor: '#475569', borderWidth: 1, borderRadius: 25, justifyContent: 'center', alignItems: 'center' }, clearText: { color: '#cbd5e1', fontWeight: '700' }, saveButton: { flex: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: '#8b5cf6', borderRadius: 25, paddingVertical: 15 }, saveText: { color: '#fff', fontSize: 16, fontWeight: '700' }, saved: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#12372f', borderRadius: 12, padding: 13, marginTop: 14 }, savedText: { color: '#a7f3d0', fontSize: 13, fontWeight: '600' },
  recent: { color: '#f8fafc', fontSize: 18, fontWeight: '700', marginTop: 29, marginBottom: 12 }, empty: { color: '#64748b', textAlign: 'center', marginVertical: 20 }, entry: { backgroundColor: '#1e293b', padding: 16, borderRadius: 14, marginBottom: 10 }, entryTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, entryDate: { color: '#94a3b8', fontSize: 11 }, entryFeelings: { color: '#c4b5fd', fontSize: 11, flex: 1, textAlign: 'right' }, entryText: { color: '#e2e8f0', fontSize: 14, lineHeight: 20, marginTop: 8 }, entryStep: { color: '#a7f3d0', fontSize: 12, marginTop: 10 },
});
