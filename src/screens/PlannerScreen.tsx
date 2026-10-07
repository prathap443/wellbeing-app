import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons as Icon } from '@expo/vector-icons';

type PlannedTask = { id: string; title: string; effort: number; done: boolean };
type DailyPlan = { date: string; capacity: number; tasks: PlannedTask[]; updatedAt: string };

const CAPACITY_LABELS = ['Very limited', 'Low', 'Steady', 'Good', 'Plenty'];
const todayKey = () => new Date().toLocaleDateString();
// Plans used to save only a time ("12:35"); new plans save a full timestamp. Show either as a time.
const savedTime = (v: string) => (Number.isNaN(Date.parse(v)) ? v : new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

export default function PlannerScreen() {
  const [capacity, setCapacity] = useState(3);
  const [tasks, setTasks] = useState<PlannedTask[]>([]);
  const [taskTitle, setTaskTitle] = useState('');
  const [effort, setEffort] = useState(1);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    const loadPlan = async () => {
      const stored = await AsyncStorage.getItem('mental_state_plans');
      const plans: DailyPlan[] = stored ? JSON.parse(stored) : [];
      const today = plans.find((plan) => plan.date === todayKey());
      if (today) {
        setCapacity(today.capacity);
        setTasks(today.tasks);
        setSavedAt(savedTime(today.updatedAt));
      }
    };
    loadPlan();
  }, []);

  const load = tasks.reduce((total, task) => total + task.effort, 0);
  const comfortableLoad = capacity * 3;
  const overloaded = load > comfortableLoad;

  const addTask = () => {
    const title = taskTitle.trim();
    if (!title) return;
    setTasks([...tasks, { id: `${Date.now()}`, title, effort, done: false }]);
    setTaskTitle('');
    setEffort(1);
  };

  const toggleTask = (id: string) => setTasks(tasks.map((task) => task.id === id ? { ...task, done: !task.done } : task));
  const removeTask = (id: string) => setTasks(tasks.filter((task) => task.id !== id));

  const savePlan = async () => {
    const stored = await AsyncStorage.getItem('mental_state_plans');
    const plans: DailyPlan[] = stored ? JSON.parse(stored) : [];
    const updatedAt = new Date().toISOString();
    const today: DailyPlan = { date: todayKey(), capacity, tasks, updatedAt };
    await AsyncStorage.setItem('mental_state_plans', JSON.stringify([today, ...plans.filter((plan) => plan.date !== today.date)].slice(0, 60)));
    setSavedAt(savedTime(updatedAt));
    Alert.alert('Plan saved', 'Your plan is saved locally and can be updated any time.');
  };

  return <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><Icon name="calendar-outline" size={30} color="#60a5fa" /><Text style={styles.title}>Mental state planner</Text><Text style={styles.subtitle}>Plan for the capacity you have today, not an ideal version of you.</Text></View>
    <View style={styles.capacityCard}><Text style={styles.sectionTitle}>Today&apos;s capacity</Text><Text style={styles.capacityValue}>{capacity}/5</Text><Text style={styles.capacityLabel}>{CAPACITY_LABELS[capacity - 1]}</Text><View style={styles.capacityButtons}>{[1, 2, 3, 4, 5].map((value) => <TouchableOpacity key={value} style={[styles.capacityButton, capacity === value && styles.capacityButtonSelected]} onPress={() => setCapacity(value)}><Text style={[styles.capacityButtonText, capacity === value && styles.capacityButtonTextSelected]}>{value}</Text></TouchableOpacity>)}</View></View>
    <View style={styles.loadCard}><View><Text style={styles.loadTitle}>Planned load</Text><Text style={styles.loadText}>{load} of {comfortableLoad} points</Text></View><Icon name={overloaded ? 'warning-outline' : 'checkmark-circle-outline'} size={28} color={overloaded ? '#fbbf24' : '#34d399'} /></View>
    {overloaded && <Text style={styles.warning}>Your plan may be too full for today&apos;s capacity. Consider postponing or simplifying one task.</Text>}
    <Text style={styles.sectionTitle}>Add a task</Text>
    <View style={styles.taskInputRow}><TextInput style={styles.input} value={taskTitle} onChangeText={setTaskTitle} placeholder="What needs your attention?" placeholderTextColor="#64748b" onSubmitEditing={addTask} /><TouchableOpacity style={styles.addButton} onPress={addTask}><Icon name="add-outline" size={23} color="#fff" /></TouchableOpacity></View>
    <View style={styles.effortRow}><Text style={styles.effortLabel}>Effort</Text>{[1, 2, 3].map((value) => <TouchableOpacity key={value} style={[styles.effortButton, effort === value && styles.effortButtonSelected]} onPress={() => setEffort(value)}><Text style={[styles.effortText, effort === value && styles.effortTextSelected]}>{value === 1 ? 'Light' : value === 2 ? 'Medium' : 'High'}</Text></TouchableOpacity>)}</View>
    <Text style={styles.sectionTitle}>Today&apos;s plan</Text>
    {tasks.length === 0 ? <Text style={styles.empty}>Add only what feels manageable. One small task counts.</Text> : tasks.map((task) => <View key={task.id} style={styles.task}><TouchableOpacity onPress={() => toggleTask(task.id)}><Icon name={task.done ? 'checkmark-circle' : 'ellipse-outline'} size={25} color={task.done ? '#34d399' : '#64748b'} /></TouchableOpacity><View style={styles.taskBody}><Text style={[styles.taskTitle, task.done && styles.taskDone]}>{task.title}</Text><Text style={styles.taskMeta}>{task.effort === 1 ? 'Light effort' : task.effort === 2 ? 'Medium effort' : 'High effort'}</Text></View><TouchableOpacity onPress={() => removeTask(task.id)}><Icon name="close-outline" size={20} color="#94a3b8" /></TouchableOpacity></View>)}
    <TouchableOpacity style={styles.saveButton} onPress={savePlan}><Icon name="save-outline" size={20} color="#fff" /><Text style={styles.saveText}>{savedAt ? `Update plan - saved ${savedAt}` : 'Save today\'s plan'}</Text></TouchableOpacity>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 20, paddingBottom: 40 }, header: { marginBottom: 24 }, title: { color: '#f8fafc', fontSize: 26, fontWeight: '700', marginTop: 12 }, subtitle: { color: '#94a3b8', lineHeight: 21, marginTop: 7 },
  capacityCard: { backgroundColor: '#172554', borderRadius: 18, padding: 20, alignItems: 'center' }, sectionTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '700', marginTop: 24, marginBottom: 12 }, capacityValue: { color: '#93c5fd', fontSize: 42, fontWeight: '700', marginTop: 5 }, capacityLabel: { color: '#bfdbfe', marginTop: 2 }, capacityButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 }, capacityButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center' }, capacityButtonSelected: { backgroundColor: '#2563eb' }, capacityButtonText: { color: '#bfdbfe', fontWeight: '700' }, capacityButtonTextSelected: { color: '#fff' },
  loadCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 16, padding: 18, marginTop: 16 }, loadTitle: { color: '#f8fafc', fontWeight: '700' }, loadText: { color: '#94a3b8', marginTop: 4 }, warning: { color: '#fde68a', lineHeight: 20, marginTop: 12, backgroundColor: '#78350f', borderRadius: 12, padding: 13 },
  taskInputRow: { flexDirection: 'row', gap: 10 }, input: { flex: 1, backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, borderRadius: 12, color: '#f8fafc', paddingHorizontal: 14 }, addButton: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' }, effortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }, effortLabel: { color: '#94a3b8', marginRight: 2 }, effortButton: { borderWidth: 1, borderColor: '#334155', paddingVertical: 8, paddingHorizontal: 11, borderRadius: 16 }, effortButtonSelected: { borderColor: '#60a5fa', backgroundColor: '#172554' }, effortText: { color: '#94a3b8', fontSize: 12 }, effortTextSelected: { color: '#bfdbfe', fontWeight: '700' },
  empty: { color: '#64748b', textAlign: 'center', marginVertical: 20 }, task: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: '#1e293b', borderRadius: 14, padding: 15, marginBottom: 10 }, taskBody: { flex: 1 }, taskTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '600' }, taskDone: { color: '#6ee7b7', textDecorationLine: 'line-through' }, taskMeta: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  saveButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9, backgroundColor: '#2563eb', borderRadius: 28, paddingVertical: 16, marginTop: 20 }, saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
