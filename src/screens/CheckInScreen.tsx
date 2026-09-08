import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons as Icon } from '@expo/vector-icons';

const SCALE = [1, 2, 3, 4, 5];

type CheckIn = {
  sleep: number;
  energy: number;
  stress: number;
  date: string;
  createdAt: string;
};

const todayKey = () => new Date().toLocaleDateString();

export default function CheckInScreen() {
  const [sleep, setSleep] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [savedCheckIn, setSavedCheckIn] = useState<CheckIn | null>(null);

  useEffect(() => {
    const loadToday = async () => {
      const stored = await AsyncStorage.getItem('daily_check_ins');
      const entries: CheckIn[] = stored ? JSON.parse(stored) : [];
      const today = entries.find((entry) => entry.date === todayKey());
      if (today) {
        setSleep(today.sleep);
        setEnergy(today.energy);
        setStress(today.stress);
        setSavedCheckIn(today);
      }
    };
    loadToday();
  }, []);

  const saveCheckIn = async () => {
    if (sleep === null || energy === null || stress === null) {
      Alert.alert('Complete your check-in', 'Choose a value for sleep, energy, and stress.');
      return;
    }

    const stored = await AsyncStorage.getItem('daily_check_ins');
    const entries: CheckIn[] = stored ? JSON.parse(stored) : [];
    const entry: CheckIn = { sleep, energy, stress, date: todayKey(), createdAt: new Date().toISOString() };
    const updated = [entry, ...entries.filter((existing) => existing.date !== entry.date)].slice(0, 90);
    await AsyncStorage.setItem('daily_check_ins', JSON.stringify(updated));
    setSavedCheckIn(entry);
  };

  const recommendation = () => {
    if (!savedCheckIn) return '';
    if (savedCheckIn.stress >= 4) return 'Stress is high today. Try the breathing or grounding tool, and consider reaching out to someone you trust.';
    if (savedCheckIn.sleep <= 2) return 'Sleep was limited. Keep today gentle where possible and use the Sleep reset checklist this evening.';
    if (savedCheckIn.energy <= 2) return 'Energy is low. A short break, water, food, movement, or fresh air may help you reset.';
    return 'You have checked in with yourself today. Keep noticing what supports your wellbeing.';
  };

  const scale = (label: string, value: number | null, onChange: (next: number) => void, low: string, high: string) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{label}</Text>
        <Text style={styles.value}>{value ?? '-'}/5</Text>
      </View>
      <View style={styles.scale}>{SCALE.map((item) => (
        <TouchableOpacity key={item} onPress={() => onChange(item)} style={[styles.dot, value === item && styles.dotActive]}>
          <Text style={[styles.dotText, value === item && styles.dotTextActive]}>{item}</Text>
        </TouchableOpacity>
      ))}</View>
      <View style={styles.scaleLabels}><Text style={styles.scaleLabel}>{low}</Text><Text style={styles.scaleLabel}>{high}</Text></View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}><Icon name="pulse-outline" size={28} color="#34d399" /><Text style={styles.title}>Daily check-in</Text><Text style={styles.subtitle}>Notice how your day is affecting you.</Text></View>
      {scale('Sleep quality', sleep, setSleep, 'Poor', 'Restful')}
      {scale('Energy level', energy, setEnergy, 'Low', 'High')}
      {scale('Stress level', stress, setStress, 'Calm', 'Overwhelmed')}
      <TouchableOpacity style={styles.saveButton} onPress={saveCheckIn}><Icon name="checkmark-outline" size={20} color="#fff" /><Text style={styles.saveText}>{savedCheckIn ? 'Update today\'s check-in' : 'Save check-in'}</Text></TouchableOpacity>
      {savedCheckIn && <View style={styles.savedCard}>
        <View style={styles.savedHeader}><Icon name="checkmark-circle" size={22} color="#34d399" /><Text style={styles.savedTitle}>Today\'s check-in saved</Text></View>
        <Text style={styles.savedStats}>Sleep {savedCheckIn.sleep}/5   Energy {savedCheckIn.energy}/5   Stress {savedCheckIn.stress}/5</Text>
        <Text style={styles.recommendation}>{recommendation()}</Text>
      </View>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 20, paddingBottom: 40 },
  header: { marginBottom: 24 }, title: { color: '#f8fafc', fontSize: 26, fontWeight: '700', marginTop: 12 }, subtitle: { color: '#94a3b8', fontSize: 14, marginTop: 6 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 18, marginBottom: 16 }, cardHeader: { flexDirection: 'row', justifyContent: 'space-between' }, cardTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '600' }, value: { color: '#34d399', fontWeight: '700' },
  scale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 }, dot: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center' }, dotActive: { backgroundColor: '#10b981' }, dotText: { color: '#cbd5e1', fontWeight: '700' }, dotTextActive: { color: '#fff' }, scaleLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }, scaleLabel: { color: '#94a3b8' },
  saveButton: { flexDirection: 'row', gap: 8, justifyContent: 'center', backgroundColor: '#10b981', borderRadius: 28, alignItems: 'center', paddingVertical: 16, marginTop: 8 }, saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  savedCard: { backgroundColor: '#12372f', borderRadius: 16, padding: 18, marginTop: 18, borderWidth: 1, borderColor: '#166534' }, savedHeader: { flexDirection: 'row', gap: 8, alignItems: 'center' }, savedTitle: { color: '#d1fae5', fontSize: 16, fontWeight: '700' }, savedStats: { color: '#a7f3d0', marginTop: 12, fontWeight: '600' }, recommendation: { color: '#d1fae5', lineHeight: 21, marginTop: 12 },
});
