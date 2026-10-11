import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { dayKey } from '../lib/habits';
import { formatSleep, healthAvailable, isHealthConnected, readHealthDays } from '../lib/health';
import {
  ENERGY_LABELS, carryOver, dayMessage, decideCarry, heaviestOpen, loadPlans, moveToTomorrow, newTaskId, room, savePlans, todaysCheckInEnergy, upsert, used,
  type Plan, type Task,
} from '../lib/planner';

const EFFORT = { 1: 'Light', 2: 'Medium', 3: 'Heavy' } as const;
const Bars = ({ n, color = '#93c5fd' }: { n: number; color?: string }) => <View style={styles.bars}>{[1, 2, 3].map((i) => <View key={i} style={[styles.bar, { backgroundColor: i <= n ? color : '#334155' }]} />)}</View>;
const shortDay = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long' }); };

export default function PlannerScreen() {
  const navigation = useNavigation<any>();
  // From a journal next step: added straight away as a light task (once).
  const prefill = ((useRoute<any>().params ?? {}) as { prefillTask?: string }).prefillTask;
  const prefilled = useRef<string | null>(null);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [today, setToday] = useState<Plan | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [suggested, setSuggested] = useState<{ energy: number | null; sleep: string | null }>({ energy: null, sleep: null });
  const [title, setTitle] = useState('');
  const [effort, setEffort] = useState<1 | 2 | 3>(1);
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [smaller, setSmaller] = useState<{ id: string; title: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const todayKey = dayKey(new Date());

  const commit = useCallback(async (nextPlans: Plan[], nextToday: Plan) => {
    setPlans(nextPlans); setToday(nextToday); setSaveError(false);
    try { await savePlans(nextPlans); } catch { setSaveError(true); }
  }, []);

  const load = useCallback(async () => {
    setLoadError(false);
    const r = await loadPlans();
    if (!r.ok) { setLoadError(true); return; }
    const [energy, sleepText] = await Promise.all([
      todaysCheckInEnergy(todayKey),
      (async () => {
        try {
          if (!healthAvailable() || !(await isHealthConnected())) return null;
          const t = (await readHealthDays(1)).find((d) => dayKey(d.date) === todayKey);
          return t?.sleepMinutes ? formatSleep(t.sleepMinutes) : null;
        } catch { return null; }
      })(),
    ]);
    setSuggested({ energy, sleep: sleepText });
    let mine = r.plans.find((p) => p.date === todayKey);
    let all = r.plans;
    // Energy not chosen yet today: use today's check-in if there is one.
    if (!mine) mine = { date: todayKey, capacity: energy ?? 3, capacitySet: energy !== null, tasks: [], updatedAt: new Date().toISOString() };
    else if (mine.capacitySet === false && energy !== null) mine = { ...mine, capacity: energy, capacitySet: true };
    if (r.changed) { all = upsert(all, mine); savePlans(all).catch(() => undefined); }
    setPlans(all); setToday(mine);
  }, [todayKey]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!plans || !today || !prefill || prefilled.current === prefill) return;
    prefilled.current = prefill;
    if (today.tasks.some((t) => t.title === prefill.trim())) return;
    const next: Plan = { ...today, tasks: [...today.tasks, { id: newTaskId(), title: prefill.trim().slice(0, 300), effort: 1, done: false, fromJournal: true }], updatedAt: new Date().toISOString() };
    commit(upsert(plans, next), next);
    setNote('Added your journal step as a light task. Change its weight if you need to.');
  }, [plans, today, prefill, commit]);

  if (!plans || !today) {
    return <View style={[styles.container, styles.center]}>
      {loadError ? <>
        <Icon name="alert-circle-outline" size={30} color="#fca5a5" />
        <Text style={styles.errorTitle}>Couldn't open your plans</Text>
        <Text style={styles.muted}>Nothing has been changed. Try again in a moment.</Text>
        <TouchableOpacity style={styles.secondary} onPress={load}><Text style={styles.secondaryText}>Retry</Text></TouchableOpacity>
      </> : <ActivityIndicator color="#60a5fa" />}
    </View>;
  }

  const update = (patch: Partial<Plan>) => { const next = { ...today, ...patch, updatedAt: new Date().toISOString() }; commit(upsert(plans, next), next); };
  const setTasks = (tasks: Task[]) => update({ tasks });
  const capacity = today.capacity;
  const budget = room(capacity);
  const load_ = used(today.tasks);
  const over = load_ > budget;
  const heavy = over ? heaviestOpen(today.tasks) : null;
  const carry = carryOver(plans, todayKey);
  const message = dayMessage(today.tasks, capacity, new Date().getHours());

  const addTask = () => {
    const t = title.trim();
    if (!t) return;
    setTasks([...today.tasks, { id: newTaskId(), title: t.slice(0, 300), effort, done: false }]);
    setTitle(''); setEffort(1);
  };
  const toggle = (id: string) => setTasks(today.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const letGo = (id: string) => { setTasks(today.tasks.filter((t) => t.id !== id)); setOpenTask(null); };
  const toTomorrow = (id: string) => { const r = moveToTomorrow(plans, today, id); commit(r.plans, r.today); setOpenTask(null); setNote('Moved to tomorrow. It will be waiting there.'); };
  const applySmaller = () => {
    if (!smaller || !smaller.title.trim()) return;
    setTasks(today.tasks.map((t) => (t.id === smaller.id ? { ...t, title: smaller.title.trim().slice(0, 300), effort: (Math.max(1, t.effort - 1) as 1 | 2 | 3) } : t)));
    setSmaller(null); setOpenTask(null);
  };
  const carryDecide = (ids: string[], decision: 'kept' | 'let_go') => { if (!carry) return; const r = decideCarry(plans, today, carry.plan.date, ids, decision); commit(r.plans, r.today); };

  const actions = (t: Task) => smaller?.id === t.id ? <View style={styles.smallerBox}>
    <Text style={styles.muted}>A smaller first part of this (it becomes one bar lighter):</Text>
    <TextInput style={styles.input} value={smaller.title} onChangeText={(v) => setSmaller({ id: t.id, title: v })} maxLength={300} autoFocus />
    <View style={styles.row}>
      <TouchableOpacity style={styles.primarySmall} onPress={applySmaller}><Text style={styles.primarySmallText}>Use this</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => setSmaller(null)}><Text style={styles.linkText}>Cancel</Text></TouchableOpacity>
    </View>
  </View> : <View style={styles.row}>
    <TouchableOpacity style={styles.actionChip} onPress={() => toTomorrow(t.id)}><Icon name="arrow-forward-outline" size={14} color="#bfdbfe" /><Text style={styles.actionText}>Move to tomorrow</Text></TouchableOpacity>
    <TouchableOpacity style={styles.actionChip} onPress={() => setSmaller({ id: t.id, title: t.title })}><Icon name="contract-outline" size={14} color="#bfdbfe" /><Text style={styles.actionText}>Make it smaller</Text></TouchableOpacity>
    <TouchableOpacity style={styles.actionChip} onPress={() => letGo(t.id)}><Icon name="close-outline" size={14} color="#bfdbfe" /><Text style={styles.actionText}>Let it go</Text></TouchableOpacity>
  </View>;

  return <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><Icon name="battery-half-outline" size={30} color="#60a5fa" /><Text style={styles.title}>Energy planner</Text><Text style={styles.subtitle}>Match today's list to the energy you actually have, not an ideal version of you.</Text></View>

    {carry ? <View style={styles.carryCard}>
      <Text style={styles.carryTitle}>From {shortDay(carry.plan.date)}: {carry.tasks.length} unfinished</Text>
      {carry.tasks.map((t) => <View key={t.id} style={styles.carryRow}>
        <Text style={styles.carryTask} numberOfLines={2}>{t.title}</Text>
        <TouchableOpacity onPress={() => carryDecide([t.id], 'kept')}><Text style={styles.keep}>Keep</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => carryDecide([t.id], 'let_go')}><Text style={styles.letGo}>Let go</Text></TouchableOpacity>
      </View>)}
      {carry.tasks.length > 1 ? <View style={styles.row}>
        <TouchableOpacity style={styles.primarySmall} onPress={() => carryDecide(carry.tasks.map((t) => t.id), 'kept')}><Text style={styles.primarySmallText}>Keep all</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => carryDecide(carry.tasks.map((t) => t.id), 'let_go')}><Text style={styles.linkText}>Let them all go</Text></TouchableOpacity>
      </View> : null}
    </View> : null}

    <View style={styles.energyCard}>
      <Text style={styles.cardLabel}>TODAY'S ENERGY</Text>
      <Text style={styles.energyValue}>{ENERGY_LABELS[capacity - 1]}</Text>
      {suggested.energy !== null || suggested.sleep ? <Text style={styles.energyFrom}>
        {[suggested.energy !== null ? `From your check-in: energy ${suggested.energy} of 5` : null, suggested.sleep ? `you slept ${suggested.sleep}` : null].filter(Boolean).join(', and ')}. Change it if it feels different.
      </Text> : <Text style={styles.energyFrom}>How much energy do you have today? A quick guess is fine.</Text>}
      <View style={styles.energyRow}>{[1, 2, 3, 4, 5].map((v) => <TouchableOpacity key={v} onPress={() => update({ capacity: v, capacitySet: true })} style={[styles.energyBtn, capacity === v && styles.energyBtnOn]} accessibilityRole="button" accessibilityLabel={`Energy ${ENERGY_LABELS[v - 1]}`} accessibilityState={{ selected: capacity === v }}>
        <Icon name={v <= 2 ? 'battery-dead-outline' : v <= 3 ? 'battery-half-outline' : 'battery-full-outline'} size={18} color={capacity === v ? '#0b1530' : '#93c5fd'} />
        <Text style={[styles.energyBtnText, capacity === v && styles.energyBtnTextOn]}>{v}</Text>
      </TouchableOpacity>)}</View>
    </View>

    <View style={styles.batteryCard}>
      <Text style={styles.batteryText}>{over ? `Room for about ${budget}, you've planned ${load_}` : `Room for about ${budget}. Planned ${load_}.`}</Text>
      <View style={styles.battery}>{Array.from({ length: Math.max(budget, load_) }, (_, i) => <View key={i} style={[styles.cell, i < load_ && (i < budget ? styles.cellUsed : styles.cellOver), i >= budget && styles.cellExtra]} />)}</View>
      <Text style={styles.muted}>Light tasks use 1 bar, medium 2, heavy 3.</Text>
    </View>
    {over && heavy ? <View style={styles.overCard}>
      <Text style={styles.overText}>Your plan is fuller than your energy today. What if "{heavy.title}" waited?</Text>
      {actions(heavy)}
    </View> : null}
    {note ? <View style={styles.noteRow}><Icon name="checkmark-circle" size={16} color="#6ee7b7" /><Text style={styles.noteText}>{note}</Text></View> : null}

    <Text style={styles.sectionTitle}>Today's plan</Text>
    {today.tasks.length === 0 ? <Text style={styles.muted}>Add only what feels manageable. One small task counts.</Text> : null}
    {today.tasks.map((t) => <View key={t.id} style={styles.task}>
      <View style={styles.taskTop}>
        <TouchableOpacity onPress={() => toggle(t.id)} accessibilityRole="checkbox" accessibilityState={{ checked: t.done }} accessibilityLabel={t.title}>
          <Icon name={t.done ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={t.done ? '#34d399' : '#64748b'} />
        </TouchableOpacity>
        <View style={styles.taskBody}>
          <Text style={[styles.taskTitle, t.done && styles.taskDone]}>{t.title}</Text>
          <View style={styles.metaRow}><Bars n={t.effort} /><Text style={styles.taskMeta}>{EFFORT[t.effort]}{t.from ? ` · from ${shortDay(t.from)}` : t.fromJournal ? ' · from your journal' : ''}</Text></View>
        </View>
        {!t.done ? <TouchableOpacity onPress={() => { setOpenTask(openTask === t.id ? null : t.id); setSmaller(null); }} accessibilityLabel={`Options for ${t.title}`}><Icon name="ellipsis-horizontal" size={20} color="#94a3b8" /></TouchableOpacity> : null}
      </View>
      {openTask === t.id && !(over && heavy?.id === t.id) ? actions(t) : null}
    </View>)}
    {message ? <View style={styles.dayCard}><Icon name="sparkles-outline" size={18} color="#fde68a" /><Text style={styles.dayText}>{message}</Text></View> : null}

    <Text style={styles.sectionTitle}>Add a task</Text>
    <View style={styles.addRow}><TextInput style={[styles.input, { flex: 1, marginTop: 0 }]} value={title} onChangeText={setTitle} maxLength={300} placeholder="What needs your attention?" placeholderTextColor="#64748b" onSubmitEditing={addTask} />
      <TouchableOpacity style={[styles.addButton, !title.trim() && styles.disabled]} onPress={addTask} disabled={!title.trim()} accessibilityLabel="Add task"><Icon name="add-outline" size={23} color="#fff" /></TouchableOpacity></View>
    <View style={styles.effortRow}>{([1, 2, 3] as const).map((v) => <TouchableOpacity key={v} style={[styles.effortBtn, effort === v && styles.effortBtnOn]} onPress={() => setEffort(v)} accessibilityState={{ selected: effort === v }}>
      <Bars n={v} color={effort === v ? '#0b1530' : '#93c5fd'} /><Text style={[styles.effortText, effort === v && styles.effortTextOn]}>{EFFORT[v]}</Text>
    </TouchableOpacity>)}</View>
    <Text style={[styles.saved, saveError && styles.error]}>{saveError ? "Couldn't save on this phone. Your changes will be tried again with your next edit." : 'Saved automatically on this phone.'}</Text>
    <TouchableOpacity onPress={() => navigation.navigate('Goals')} style={styles.habitLink}><Text style={styles.linkText}>Something you want to do every day? Make it a habit instead ›</Text></TouchableOpacity>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 20, paddingBottom: 40 }, center: { justifyContent: 'center', alignItems: 'center', gap: 10 },
  header: { marginBottom: 18 }, title: { color: '#f8fafc', fontSize: 26, fontWeight: '700', marginTop: 12 }, subtitle: { color: '#94a3b8', lineHeight: 21, marginTop: 7 },
  carryCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#334155' }, carryTitle: { color: '#f8fafc', fontWeight: '700', marginBottom: 6 },
  carryRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 }, carryTask: { color: '#cbd5e1', flex: 1 }, keep: { color: '#6ee7b7', fontWeight: '800' }, letGo: { color: '#94a3b8', fontWeight: '700' },
  energyCard: { backgroundColor: '#172554', borderRadius: 18, padding: 18 }, cardLabel: { color: '#93c5fd', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  energyValue: { color: '#f8fafc', fontSize: 26, fontWeight: '700', marginTop: 6 }, energyFrom: { color: '#bfdbfe', lineHeight: 19, marginTop: 6, fontSize: 13 },
  energyRow: { flexDirection: 'row', gap: 8, marginTop: 14 }, energyBtn: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: '#1e40af' }, energyBtnOn: { backgroundColor: '#93c5fd', borderColor: '#93c5fd' },
  energyBtnText: { color: '#bfdbfe', fontWeight: '800', fontSize: 12 }, energyBtnTextOn: { color: '#0b1530' },
  batteryCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginTop: 12 }, batteryText: { color: '#f8fafc', fontWeight: '700' },
  battery: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 10, marginBottom: 8 }, cell: { width: 16, height: 22, borderRadius: 4, backgroundColor: '#334155' }, cellUsed: { backgroundColor: '#60a5fa' }, cellOver: { backgroundColor: '#f59e0b' }, cellExtra: { borderWidth: 1, borderColor: '#f59e0b' },
  overCard: { backgroundColor: '#3a2f12', borderRadius: 14, padding: 14, marginTop: 12 }, overText: { color: '#fde68a', lineHeight: 20 },
  noteRow: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#12372f', borderRadius: 12, padding: 11, marginTop: 12 }, noteText: { color: '#a7f3d0', flex: 1, fontSize: 13 },
  sectionTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '700', marginTop: 22, marginBottom: 10 },
  task: { backgroundColor: '#1e293b', borderRadius: 14, padding: 14, marginBottom: 10 }, taskTop: { flexDirection: 'row', alignItems: 'center', gap: 12 }, taskBody: { flex: 1 },
  taskTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '600' }, taskDone: { color: '#6ee7b7', textDecorationLine: 'line-through' }, metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }, taskMeta: { color: '#94a3b8', fontSize: 12 },
  bars: { flexDirection: 'row', gap: 2 }, bar: { width: 6, height: 12, borderRadius: 2 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10 },
  actionChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#1e40af', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 }, actionText: { color: '#bfdbfe', fontSize: 12, fontWeight: '700' },
  smallerBox: { marginTop: 10 }, primarySmall: { backgroundColor: '#60a5fa', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 }, primarySmallText: { color: '#0b1530', fontWeight: '800' },
  dayCard: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#3a2f12', borderRadius: 12, padding: 12, marginTop: 4 }, dayText: { color: '#fde68a', flex: 1, fontWeight: '600' },
  addRow: { flexDirection: 'row', gap: 10 }, input: { backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, borderRadius: 12, padding: 13, color: '#f8fafc', marginTop: 8 },
  addButton: { width: 50, borderRadius: 12, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: 0.45 },
  effortRow: { flexDirection: 'row', gap: 8, marginTop: 10 }, effortBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#334155', borderRadius: 12, paddingVertical: 10 }, effortBtnOn: { backgroundColor: '#93c5fd', borderColor: '#93c5fd' },
  effortText: { color: '#cbd5e1', fontWeight: '700', fontSize: 13 }, effortTextOn: { color: '#0b1530' },
  saved: { color: '#64748b', fontSize: 12, marginTop: 14 }, error: { color: '#fca5a5' }, habitLink: { marginTop: 14 }, linkText: { color: '#93c5fd', fontWeight: '700' },
  secondary: { borderColor: '#475569', borderWidth: 1, borderRadius: 22, paddingVertical: 10, paddingHorizontal: 20, marginTop: 8 }, secondaryText: { color: '#cbd5e1', fontWeight: '700' },
  muted: { color: '#94a3b8', lineHeight: 19, fontSize: 13 }, errorTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '700' },
});
