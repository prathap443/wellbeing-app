import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import React, { useState } from 'react';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type AnxietySupportParams = {
  Breathe: undefined;
  Grounding: undefined;
  Journal: undefined;
  SupportGuidance: undefined;
};

const NEXT_STEPS = ['Take three slower breaths', 'Step outside for two minutes', 'Message someone I trust', 'Write down what I need'];

export default function AnxietySupportScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AnxietySupportParams>>();
  const [worry, setWorry] = useState('');
  const [nextStep, setNextStep] = useState('');

  return <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><Icon name="shield-outline" size={31} color="#93c5fd" /><Text style={styles.title}>Anxiety support</Text><Text style={styles.subtitle}>A quiet place to slow down, notice what is happening, and choose one gentle next step.</Text></View>
    <View style={styles.boundary}><Icon name="information-circle-outline" size={20} color="#bfdbfe" /><Text style={styles.boundaryText}>This is a wellbeing tool, not treatment, diagnosis, or a replacement for professional mental-health care.</Text></View>
    <Text style={styles.sectionTitle}>Right now</Text>
    <View style={styles.toolGrid}><TouchableOpacity style={styles.tool} onPress={() => navigation.navigate('Breathe')}><Icon name="leaf-outline" size={25} color="#5eead4" /><Text style={styles.toolTitle}>2-minute reset</Text><Text style={styles.toolText}>Follow a steady breathing rhythm.</Text><Text style={styles.toolLink}>Start breathing</Text></TouchableOpacity><TouchableOpacity style={styles.tool} onPress={() => navigation.navigate('Grounding')}><Icon name="water-outline" size={25} color="#93c5fd" /><Text style={styles.toolTitle}>Come back to now</Text><Text style={styles.toolText}>Use your senses to ground yourself.</Text><Text style={styles.toolLink}>Start grounding</Text></TouchableOpacity></View>
    <Text style={styles.sectionTitle}>Name the worry</Text><Text style={styles.sectionHint}>You do not have to solve it all here. Put a few words around what feels difficult.</Text>
    <TextInput style={styles.worryInput} value={worry} onChangeText={setWorry} placeholder="What feels most worrying right now?" placeholderTextColor="#64748b" multiline textAlignVertical="top" />
    <TouchableOpacity style={styles.journalButton} onPress={() => navigation.navigate('Journal')}><Icon name="book-outline" size={19} color="#c4b5fd" /><Text style={styles.journalText}>{worry.trim() ? 'Explore this in your journal' : 'Use a guided journal prompt'}</Text><Icon name="arrow-forward-outline" size={18} color="#c4b5fd" /></TouchableOpacity>
    <Text style={styles.sectionTitle}>One small next step</Text><Text style={styles.sectionHint}>Choose something you can realistically do in the next few minutes.</Text>
    <View style={styles.stepList}>{NEXT_STEPS.map((step) => <TouchableOpacity key={step} style={[styles.step, nextStep === step && styles.stepSelected]} onPress={() => setNextStep(step)}><Icon name={nextStep === step ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={nextStep === step ? '#6ee7b7' : '#64748b'} /><Text style={[styles.stepText, nextStep === step && styles.stepTextSelected]}>{step}</Text></TouchableOpacity>)}</View>
    {nextStep ? <View style={styles.commitment}><Icon name="checkmark-circle-outline" size={20} color="#a7f3d0" /><Text style={styles.commitmentText}>For now, your next step is: {nextStep}.</Text></View> : null}
    <View style={styles.supportCard}><Icon name="people-outline" size={24} color="#fda4af" /><View style={styles.supportCopy}><Text style={styles.supportTitle}>You do not have to handle this alone</Text><Text style={styles.supportText}>A licensed mental-health professional can help you build an anxiety plan that fits your situation.</Text><TouchableOpacity onPress={() => navigation.navigate('SupportGuidance')}><Text style={styles.supportLink}>View support guidance</Text></TouchableOpacity></View></View>
    <Text style={styles.safety}>If you feel at risk of harming yourself or someone else, contact local emergency services or a crisis service now.</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 20, paddingBottom: 40 }, header: { marginBottom: 22 }, title: { color: '#f8fafc', fontSize: 26, fontWeight: '700', marginTop: 12 }, subtitle: { color: '#94a3b8', lineHeight: 21, marginTop: 7 }, boundary: { flexDirection: 'row', gap: 10, backgroundColor: '#172554', borderWidth: 1, borderColor: '#1e3a8a', borderRadius: 14, padding: 14 }, boundaryText: { color: '#bfdbfe', fontSize: 12, lineHeight: 18, flex: 1 },
  sectionTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '700', marginTop: 25, marginBottom: 7 }, sectionHint: { color: '#94a3b8', fontSize: 12, lineHeight: 18, marginBottom: 11 }, toolGrid: { flexDirection: 'row', gap: 10 }, tool: { flex: 1, backgroundColor: '#1e293b', borderRadius: 16, padding: 15 }, toolTitle: { color: '#f8fafc', fontSize: 14, fontWeight: '700', marginTop: 11 }, toolText: { color: '#94a3b8', fontSize: 11, lineHeight: 16, marginTop: 5 }, toolLink: { color: '#99f6e4', fontSize: 12, fontWeight: '700', marginTop: 14 },
  worryInput: { minHeight: 100, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 14, padding: 14, color: '#f8fafc', lineHeight: 20 }, journalButton: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#312e4d', borderRadius: 13, padding: 14, marginTop: 10 }, journalText: { color: '#ddd6fe', fontSize: 13, fontWeight: '700', flex: 1 },
  stepList: { gap: 8 }, step: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#1e293b', borderRadius: 13, borderWidth: 1, borderColor: '#334155', padding: 14 }, stepSelected: { backgroundColor: '#133c35', borderColor: '#34d399' }, stepText: { color: '#cbd5e1', fontSize: 13, flex: 1 }, stepTextSelected: { color: '#d1fae5', fontWeight: '700' }, commitment: { flexDirection: 'row', gap: 9, alignItems: 'center', backgroundColor: '#14532d', borderRadius: 13, padding: 14, marginTop: 11 }, commitmentText: { color: '#bbf7d0', fontSize: 12, lineHeight: 18, flex: 1 },
  supportCard: { flexDirection: 'row', gap: 13, backgroundColor: '#4c1d2b', borderRadius: 16, padding: 17, marginTop: 25 }, supportCopy: { flex: 1 }, supportTitle: { color: '#ffe4e6', fontSize: 15, fontWeight: '700' }, supportText: { color: '#fecdd3', fontSize: 12, lineHeight: 18, marginTop: 6 }, supportLink: { color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 13 }, safety: { color: '#64748b', textAlign: 'center', fontSize: 11, lineHeight: 16, marginTop: 20, paddingHorizontal: 12 },
});
