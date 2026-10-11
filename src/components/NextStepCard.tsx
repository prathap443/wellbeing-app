import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { answerNextStep, entryId, type JournalEntry, type StepAnswer } from '../lib/journal';

/**
 * A reflection's next step, brought back at the right moment.
 * - home: "Your next step" while it's open (up to 3 days): Done / Make it smaller / Not today.
 * - journal: "Last time you planned… Did it happen?": Yes / Not yet, then offers to make it smaller.
 * The parent keeps this card mounted until the screen is left, so the confirmation stays visible.
 * Writes go through answerNextStep, which re-reads the journal first, so a stale screen can't overwrite it.
 */
export default function NextStepCard({ entry, variant, onChanged }: { entry: JournalEntry; variant: 'home' | 'journal'; onChanged: (entries: JournalEntry[]) => void }) {
  const [mode, setMode] = useState<'ask' | 'smaller' | 'offerSmaller' | 'done' | 'kept' | 'hidden'>('ask');
  const [smaller, setSmaller] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [step, setStep] = useState(entry.nextStep?.trim() ?? '');
  // The same reflection can be changed elsewhere (e.g. made smaller in Journal): show the latest step.
  useEffect(() => { setStep(entry.nextStep?.trim() ?? ''); setMode('ask'); }, [entry.nextStep, entry.nextStepUpdatedAt]);

  const answer = async (a: StepAnswer, after: typeof mode) => {
    setBusy(true); setError(false);
    try { const next = await answerNextStep(entryId(entry), a); if (typeof a === 'object') setStep(a.smaller.trim()); setMode(after); onChanged(next); }
    catch { setError(true); }
    setBusy(false);
  };

  if (mode === 'hidden' || !step) return null;
  const home = variant === 'home';

  return <View style={styles.card}>
    <View style={styles.top}>
      <Text style={styles.label}>{home ? 'YOUR NEXT STEP' : 'LAST TIME YOU PLANNED'}</Text>
      {mode === 'ask' && !home ? <TouchableOpacity onPress={() => answer('dismissed', 'hidden')} accessibilityLabel="Don't ask about this step" disabled={busy}><Icon name="close" size={18} color="#64748b" /></TouchableOpacity> : null}
    </View>
    <Text style={styles.step}>{step}</Text>

    {mode === 'ask' ? <>
      {!home ? <Text style={styles.q}>Did it happen?</Text> : null}
      <View style={styles.row}>
        <TouchableOpacity style={styles.yes} onPress={() => answer('done', 'done')} disabled={busy} accessibilityRole="button"><Text style={styles.yesText}>{home ? 'Done' : 'Yes, I did'}</Text></TouchableOpacity>
        {home ? <>
          <TouchableOpacity style={styles.no} onPress={() => { setSmaller(step); setMode('smaller'); }} disabled={busy} accessibilityRole="button"><Text style={styles.noText}>Make it smaller</Text></TouchableOpacity>
          <TouchableOpacity style={styles.plain} onPress={() => answer('snooze', 'hidden')} disabled={busy} accessibilityRole="button"><Text style={styles.plainText}>Not today</Text></TouchableOpacity>
        </> : <TouchableOpacity style={styles.no} onPress={() => answer('not_yet', 'offerSmaller')} disabled={busy} accessibilityRole="button"><Text style={styles.noText}>Not yet</Text></TouchableOpacity>}
        {busy ? <ActivityIndicator color="#6ee7b7" /> : null}
      </View>
    </> : null}

    {mode === 'offerSmaller' ? <>
      <Text style={styles.note}>That's okay. Would a smaller version be easier?</Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.no} onPress={() => { setSmaller(step); setMode('smaller'); }} accessibilityRole="button"><Text style={styles.noText}>Make it smaller</Text></TouchableOpacity>
        <TouchableOpacity style={styles.plain} onPress={() => setMode('kept')} accessibilityRole="button"><Text style={styles.plainText}>Keep it as it is</Text></TouchableOpacity>
      </View>
    </> : null}

    {mode === 'smaller' ? <>
      <Text style={styles.note}>What's a smaller first part of this? For example, "write one line" instead of "write the email".</Text>
      <TextInput style={styles.input} value={smaller} onChangeText={setSmaller} maxLength={500} multiline placeholder="A smaller step" placeholderTextColor="#64748b" autoFocus />
      <View style={styles.row}>
        <TouchableOpacity style={[styles.yes, (!smaller.trim() || smaller.trim() === step) && styles.disabled]} disabled={busy || !smaller.trim() || smaller.trim() === step} onPress={() => answer({ smaller }, 'kept')} accessibilityRole="button"><Text style={styles.yesText}>Use this step</Text></TouchableOpacity>
        <TouchableOpacity style={styles.plain} onPress={() => setMode('ask')} disabled={busy}><Text style={styles.plainText}>Cancel</Text></TouchableOpacity>
      </View>
    </> : null}

    {mode === 'done' ? <Text style={styles.note}>Well done for following through.</Text> : null}
    {mode === 'kept' ? <Text style={styles.note}>{home ? "Saved. It's here when you're ready." : "It's still here when you're ready."}</Text> : null}
    {error ? <Text style={styles.error}>Couldn't save that on this phone. Please try again.</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#12372f', borderRadius: 17, padding: 16, marginBottom: 14 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: '#6ee7b7', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  step: { color: '#f8fafc', fontSize: 16, lineHeight: 23, marginTop: 8 },
  q: { color: '#a7f3d0', marginTop: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 10 },
  yes: { backgroundColor: '#6ee7b7', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 9 }, yesText: { color: '#052e2b', fontWeight: '800' },
  no: { borderColor: '#6ee7b7', borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 }, noText: { color: '#a7f3d0', fontWeight: '700' },
  plain: { paddingHorizontal: 6, paddingVertical: 8 }, plainText: { color: '#94a3b8', fontWeight: '700' },
  note: { color: '#a7f3d0', marginTop: 10, lineHeight: 20 },
  input: { backgroundColor: '#0f2a24', borderColor: '#1f6f5c', borderWidth: 1, borderRadius: 12, padding: 12, color: '#f8fafc', marginTop: 10, minHeight: 56, textAlignVertical: 'top' },
  disabled: { opacity: 0.5 },
  error: { color: '#fca5a5', marginTop: 10 },
});
