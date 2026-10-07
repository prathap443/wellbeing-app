import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { rateActivity, type Rating } from '../lib/activity';

const OPTIONS: { value: Rating; label: string; icon: string; color: string }[] = [
  { value: 'worse', label: 'Worse', icon: 'trending-down-outline', color: '#fca5a5' },
  { value: 'same', label: 'Same', icon: 'remove-outline', color: '#cbd5e1' },
  { value: 'better', label: 'Better', icon: 'trending-up-outline', color: '#6ee7b7' },
  { value: 'much_better', label: 'Much better', icon: 'sparkles-outline', color: '#5eead4' },
];

/** "Did this help?" after a finished session. One tap; tapping again changes the answer. */
export default function FeedbackCard({ sessionId, onSkip }: { sessionId: string; onSkip?: () => void }) {
  const [chosen, setChosen] = useState<Rating | null>(null);
  const [skipped, setSkipped] = useState(false);
  if (skipped) return null;
  const choose = (value: Rating) => { setChosen(value); rateActivity(sessionId, value).catch(() => undefined); };
  return <View style={styles.card}>
    <Text style={styles.title}>{chosen ? 'Thanks, noted' : 'Did this help?'}</Text>
    <Text style={styles.text}>{chosen ? 'Your answers stay on this phone and shape what Wellbeing suggests to you.' : 'Compared with before you started, how do you feel?'}</Text>
    <View style={styles.row}>
      {OPTIONS.map((o) => <TouchableOpacity key={o.value} onPress={() => choose(o.value)} style={[styles.option, chosen === o.value && { borderColor: o.color, backgroundColor: '#0f172a' }]} accessibilityRole="button" accessibilityState={{ selected: chosen === o.value }} accessibilityLabel={o.label}>
        <Icon name={o.icon as any} size={18} color={o.color} />
        <Text style={styles.optionText}>{o.label}</Text>
      </TouchableOpacity>)}
    </View>
    {!chosen ? <TouchableOpacity onPress={() => { setSkipped(true); onSkip?.(); }} style={styles.skip}><Text style={styles.skipText}>Skip</Text></TouchableOpacity> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#1e293b', borderRadius: 18, padding: 16, width: '100%', maxWidth: 420, marginTop: 18 },
  title: { color: '#f8fafc', fontWeight: '800', fontSize: 16, textAlign: 'center' },
  text: { color: '#94a3b8', fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 4 },
  row: { flexDirection: 'row', gap: 8, marginTop: 14 },
  option: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  optionText: { color: '#e2e8f0', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  skip: { alignSelf: 'center', marginTop: 10, padding: 4 },
  skipText: { color: '#64748b', fontSize: 13 },
});
