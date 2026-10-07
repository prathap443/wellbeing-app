import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { FEELINGS, FEELING_LABEL, loadActivities, suggest, type ActivityRecord, type Feeling, type Suggestion } from '../lib/activity';

const TIMES = [1, 3, 5];

/** "What helps me?": pick a feeling and the time you have; get one thing to try, plus one alternative. */
export default function WhatHelpsCard() {
  const navigation = useNavigation<any>();
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [records, setRecords] = useState<ActivityRecord[]>([]);

  const load = useCallback(() => { loadActivities().then(setRecords).catch(() => undefined); }, []);
  useEffect(() => { load(); return navigation.addListener('focus', load); }, [navigation, load]);

  const result = feeling && minutes ? suggest(records, feeling, minutes) : null;
  const open = (s: Suggestion) => navigation.navigate(s.route, { feeling, minutes });

  return <View style={styles.card}>
    <View style={styles.head}>
      <Icon name="compass-outline" size={20} color="#fcd34d" />
      <Text style={styles.title}>What helps me?</Text>
      {feeling || minutes ? <TouchableOpacity onPress={() => { setFeeling(null); setMinutes(null); }} style={styles.reset} accessibilityLabel="Start over"><Icon name="close-outline" size={18} color="#64748b" /></TouchableOpacity> : null}
    </View>
    <Text style={styles.label}>How are you feeling?</Text>
    <View style={styles.chips}>
      {FEELINGS.map((f) => <TouchableOpacity key={f} onPress={() => setFeeling(f)} style={[styles.chip, feeling === f && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: feeling === f }}>
        <Text style={[styles.chipText, feeling === f && styles.chipTextOn]}>{FEELING_LABEL[f]}</Text>
      </TouchableOpacity>)}
    </View>
    {feeling ? <>
      <Text style={styles.label}>How much time do you have?</Text>
      <View style={styles.chips}>
        {TIMES.map((m) => <TouchableOpacity key={m} onPress={() => setMinutes(m)} style={[styles.chip, minutes === m && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: minutes === m }}>
          <Text style={[styles.chipText, minutes === m && styles.chipTextOn]}>{m} min</Text>
        </TouchableOpacity>)}
      </View>
    </> : null}
    {result ? <>
      <TouchableOpacity style={styles.pick} onPress={() => open(result.primary)} accessibilityRole="button" accessibilityLabel={`Try ${result.primary.title}`}>
        <Icon name={result.primary.icon as any} size={24} color="#5eead4" />
        <View style={styles.pickBody}>
          <Text style={styles.pickTitle}>Try {result.primary.title.charAt(0).toLowerCase() + result.primary.title.slice(1)}</Text>
          <Text style={styles.pickReason}>{result.primary.reason}</Text>
        </View>
        <Icon name="play-circle" size={30} color="#5eead4" />
      </TouchableOpacity>
      {result.alternative ? <TouchableOpacity onPress={() => open(result.alternative!)} style={styles.alt} accessibilityRole="button">
        <Text style={styles.altText}>Or try <Text style={styles.altLink}>{result.alternative.title}</Text></Text>
      </TouchableOpacity> : null}
    </> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#1e293b', borderRadius: 18, padding: 16, marginHorizontal: 20, marginTop: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#f8fafc', fontWeight: '800', fontSize: 16, flex: 1 },
  reset: { padding: 2 },
  label: { color: '#94a3b8', fontSize: 13, marginTop: 12, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#334155', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  chipOn: { backgroundColor: '#fcd34d', borderColor: '#fcd34d' },
  chipText: { color: '#cbd5e1', fontWeight: '600', fontSize: 13 },
  chipTextOn: { color: '#1c1917' },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0f172a', borderRadius: 14, padding: 14, marginTop: 14 },
  pickBody: { flex: 1 },
  pickTitle: { color: '#f8fafc', fontWeight: '800', fontSize: 15 },
  pickReason: { color: '#94a3b8', fontSize: 12, lineHeight: 17, marginTop: 3 },
  alt: { alignSelf: 'center', marginTop: 10, padding: 4 },
  altText: { color: '#94a3b8', fontSize: 13 },
  altLink: { color: '#5eead4', fontWeight: '700' },
});
