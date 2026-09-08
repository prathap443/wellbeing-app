import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons as Icon } from '@expo/vector-icons';

const HABITS = ['Set a wind-down time', 'Put screens away for 30 minutes', 'Prepare tomorrow in one small step', 'Choose a calming activity', 'Keep the room cool and comfortable'];

export default function SleepResetScreen() {
  const [completed, setCompleted] = useState<string[]>([]);
  useEffect(() => { AsyncStorage.getItem('sleep_reset_habits').then((stored) => { if (stored) setCompleted(JSON.parse(stored)); }); }, []);
  const toggle = async (habit: string) => { const next = completed.includes(habit) ? completed.filter((item) => item !== habit) : [...completed, habit]; setCompleted(next); await AsyncStorage.setItem('sleep_reset_habits', JSON.stringify(next)); };
  return <ScrollView contentContainerStyle={styles.container}>
    <Icon name="moon-outline" size={30} color="#c4b5fd" /><Text style={styles.title}>Sleep reset</Text><Text style={styles.subtitle}>A short routine can help your body recognise it is time to wind down.</Text>
    <View style={styles.scoreCard}><Text style={styles.score}>{completed.length}/{HABITS.length}</Text><Text style={styles.scoreText}>habits completed tonight</Text></View>
    {HABITS.map((habit) => { const checked = completed.includes(habit); return <TouchableOpacity key={habit} style={styles.habit} onPress={() => toggle(habit)}><Icon name={checked ? 'checkmark-circle' : 'ellipse-outline'} size={25} color={checked ? '#a78bfa' : '#64748b'} /><Text style={[styles.habitText, checked && styles.habitTextDone]}>{habit}</Text></TouchableOpacity>; })}
    <TouchableOpacity style={styles.tipButton} onPress={() => Alert.alert('Sleep tip', 'Aim for a routine that is realistic for you. Consistency often matters more than perfection.')}><Icon name="bulb-outline" size={20} color="#fef3c7" /><Text style={styles.tipText}>Show a sleep tip</Text></TouchableOpacity>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 20, paddingBottom: 40 }, title: { color: '#f8fafc', fontSize: 26, fontWeight: '700', marginTop: 12 }, subtitle: { color: '#94a3b8', lineHeight: 21, marginTop: 7 }, scoreCard: { backgroundColor: '#312e4d', borderRadius: 16, padding: 22, marginVertical: 24, alignItems: 'center' }, score: { color: '#ddd6fe', fontWeight: '700', fontSize: 34 }, scoreText: { color: '#c4b5fd', marginTop: 5 }, habit: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#1e293b', borderRadius: 14, padding: 17, marginBottom: 10 }, habitText: { color: '#e2e8f0', fontSize: 15, flex: 1 }, habitTextDone: { color: '#a78bfa', textDecorationLine: 'line-through' }, tipButton: { flexDirection: 'row', justifyContent: 'center', gap: 9, alignItems: 'center', marginTop: 18, backgroundColor: '#78350f', borderRadius: 24, paddingVertical: 14 }, tipText: { color: '#fef3c7', fontWeight: '700' },
});
