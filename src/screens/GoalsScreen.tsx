import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons as Icon } from '@expo/vector-icons';

type Habit = { id: string; title: string; detail: string; icon: string; color: string };

const HABITS: Habit[] = [
  { id: 'sleep', title: 'Sleep routine', detail: 'Follow your planned wind-down', icon: 'moon-outline', color: '#a78bfa' },
  { id: 'water', title: 'Hydration', detail: 'Drink water mindfully today', icon: 'water-outline', color: '#60a5fa' },
  { id: 'movement', title: 'Movement', detail: 'Move in a way that feels good', icon: 'walk-outline', color: '#34d399' },
  { id: 'meditation', title: 'Mindful moment', detail: 'Breathe, meditate, or pause', icon: 'leaf-outline', color: '#5eead4' },
  { id: 'connection', title: 'Social connection', detail: 'Reach out or spend time with someone', icon: 'people-outline', color: '#fbbf24' },
];

const todayKey = () => new Date().toLocaleDateString();

export default function GoalsScreen() {
  const [records, setRecords] = useState<Record<string, string[]>>({});
  const [weeklyGoal, setWeeklyGoal] = useState(4);

  useEffect(() => {
    const load = async () => {
      const [storedRecords, storedGoal] = await Promise.all([
        AsyncStorage.getItem('habit_records'),
        AsyncStorage.getItem('weekly_habit_goal'),
      ]);
      if (storedRecords) setRecords(JSON.parse(storedRecords));
      if (storedGoal) setWeeklyGoal(Number(storedGoal));
    };
    load();
  }, []);

  const todayHabits = records[todayKey()] || [];
  const completedCount = todayHabits.length;
  const weeklyDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - index);
    return records[date.toLocaleDateString()]?.length ? 1 : 0;
  }).reduce<number>((total, value) => total + value, 0);

  const toggleHabit = async (habitId: string) => {
    const updatedToday = todayHabits.includes(habitId)
      ? todayHabits.filter((item) => item !== habitId)
      : [...todayHabits, habitId];
    const updated = { ...records, [todayKey()]: updatedToday };
    setRecords(updated);
    await AsyncStorage.setItem('habit_records', JSON.stringify(updated));
  };

  const setGoal = async (next: number) => {
    setWeeklyGoal(next);
    await AsyncStorage.setItem('weekly_habit_goal', String(next));
  };

  return <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><Icon name="flag-outline" size={30} color="#fbbf24" /><Text style={styles.title}>Habits and goals</Text><Text style={styles.subtitle}>Small, repeatable actions that support your wellbeing.</Text></View>
    <View style={styles.progressCard}>
      <Text style={styles.progressNumber}>{completedCount}/{HABITS.length}</Text>
      <Text style={styles.progressTitle}>habits completed today</Text>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${(completedCount / HABITS.length) * 100}%` }]} /></View>
    </View>
    <Text style={styles.sectionTitle}>Today</Text>
    {HABITS.map((habit) => {
      const checked = todayHabits.includes(habit.id);
      return <TouchableOpacity key={habit.id} style={styles.habitCard} onPress={() => toggleHabit(habit.id)}>
        <View style={[styles.iconCircle, { backgroundColor: `${habit.color}20` }]}><Icon name={habit.icon as any} size={22} color={habit.color} /></View>
        <View style={styles.habitContent}><Text style={[styles.habitTitle, checked && styles.habitDone]}>{habit.title}</Text><Text style={styles.habitDetail}>{habit.detail}</Text></View>
        <Icon name={checked ? 'checkmark-circle' : 'ellipse-outline'} size={27} color={checked ? '#34d399' : '#64748b'} />
      </TouchableOpacity>;
    })}
    <View style={styles.goalCard}>
      <Text style={styles.goalTitle}>Weekly consistency goal</Text>
      <Text style={styles.goalText}>{weeklyDays} of {weeklyGoal} days checked in this week</Text>
      <View style={styles.goalOptions}>{[3, 4, 5, 7].map((goal) => <TouchableOpacity key={goal} onPress={() => setGoal(goal)} style={[styles.goalOption, weeklyGoal === goal && styles.goalOptionSelected]}><Text style={[styles.goalOptionText, weeklyGoal === goal && styles.goalOptionTextSelected]}>{goal} days</Text></TouchableOpacity>)}</View>
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 20, paddingBottom: 40 },
  header: { marginBottom: 24 }, title: { color: '#f8fafc', fontSize: 26, fontWeight: '700', marginTop: 12 }, subtitle: { color: '#94a3b8', lineHeight: 21, marginTop: 7 },
  progressCard: { backgroundColor: '#1d3a37', borderRadius: 18, padding: 22, alignItems: 'center', marginBottom: 25 }, progressNumber: { color: '#6ee7b7', fontSize: 36, fontWeight: '700' }, progressTitle: { color: '#a7f3d0', marginTop: 4 }, progressTrack: { height: 8, width: '100%', backgroundColor: '#14532d', borderRadius: 4, marginTop: 18, overflow: 'hidden' }, progressFill: { height: '100%', backgroundColor: '#34d399', borderRadius: 4 },
  sectionTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '700', marginBottom: 12 }, habitCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 16, padding: 15, marginBottom: 10, gap: 13 }, iconCircle: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' }, habitContent: { flex: 1 }, habitTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '700' }, habitDone: { color: '#6ee7b7', textDecorationLine: 'line-through' }, habitDetail: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  goalCard: { backgroundColor: '#312e4d', borderRadius: 18, padding: 20, marginTop: 20 }, goalTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '700' }, goalText: { color: '#c4b5fd', marginTop: 7 }, goalOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }, goalOption: { borderWidth: 1, borderColor: '#5b4b86', borderRadius: 18, paddingVertical: 8, paddingHorizontal: 12 }, goalOptionSelected: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }, goalOptionText: { color: '#c4b5fd', fontSize: 12, fontWeight: '700' }, goalOptionTextSelected: { color: '#fff' },
});
