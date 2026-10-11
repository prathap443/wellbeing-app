import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import {
  LIBRARY, MAX_ACTIVE, STEP_GOALS, autoReason, dayKey, daysShownUp, doneOn, habitDefs, lastDays, loadHabits, newCustomId,
  saveConfig, saveRecords, saveWeeklyGoal, type AutoInputs, type HabitConfig, type HabitDef, type HabitState,
} from '../lib/habits';
import { loadActivities, type Tool } from '../lib/activity';
import { loadJournal } from '../lib/journal';
import { healthAvailable, isHealthConnected, readHealthDays } from '../lib/health';
import { nightKey } from './SleepResetScreen';

const MINDFUL_TOOLS: Tool[] = ['breathe', 'grounding', 'meditation', 'bubbles', 'soundscape', 'tea', 'pause'];
const EMPTY_INPUTS: AutoInputs = { sessions: [], journalTimes: [], moodTimes: [], steps: {}, sleepResetTonight: 0 };
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Everything the automatic ticks need, read from what's already on the phone. Any part that fails is just left out. */
async function readAutoInputs(): Promise<AutoInputs> {
  const [acts, journal, moodRaw, sleepRaw] = await Promise.all([
    loadActivities().catch(() => []),
    loadJournal().catch(() => ({ ok: false as const })),
    AsyncStorage.getItem('mood_entries').catch(() => null),
    AsyncStorage.getItem('sleep_reset_habits').catch(() => null),
  ]);
  let moodTimes: string[] = [];
  try { const m = moodRaw ? JSON.parse(moodRaw) : []; moodTimes = Array.isArray(m) ? m.map((e: any) => e?.timestamp).filter((t: unknown): t is string => typeof t === 'string') : []; } catch { /* none */ }
  let sleepResetTonight = 0;
  try { const s = sleepRaw ? JSON.parse(sleepRaw) : null; if (s && s.night === nightKey() && Array.isArray(s.done)) sleepResetTonight = s.done.length; } catch { /* none */ }
  const steps: Record<string, number> = {};
  try {
    if (healthAvailable() && (await isHealthConnected())) for (const d of await readHealthDays(7)) if (d.steps != null) steps[dayKey(d.date)] = d.steps;
  } catch { /* Health unavailable: movement is ticked by hand */ }
  return {
    sessions: acts.filter((a) => MINDFUL_TOOLS.includes(a.tool)).map((a) => ({ startedAt: a.startedAt, durationSec: a.durationSec, completed: a.completed })),
    journalTimes: journal.ok ? journal.entries.map((e) => e.createdAt).filter((t): t is string => !!t) : [],
    moodTimes, steps, sleepResetTonight,
  };
}

export default function GoalsScreen() {
  const navigation = useNavigation<any>();
  const params = (useRoute<any>().params ?? {}) as { newHabit?: string };
  const [state, setState] = useState<HabitState | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [inputs, setInputs] = useState<AutoInputs>(EMPTY_INPUTS);
  const [editing, setEditing] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTiny, setNewTiny] = useState('');
  const [saveError, setSaveError] = useState(false);
  const prefilled = useRef<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(false);
    const r = await loadHabits();
    if (!r.ok) { setLoadError(true); return; }
    setState(r.state);
    if (r.migrated) saveRecords(r.state.records).catch(() => undefined); // dates moved to a fixed format
    setInputs(await readAutoInputs());
  }, []);
  useEffect(() => navigation.addListener('focus', load), [navigation, load]);
  useEffect(() => { load(); }, [load]);

  // From a journal next step: "Make it a habit" opens the add form, filled in.
  useEffect(() => {
    if (!state || !params.newHabit || prefilled.current === params.newHabit) return;
    prefilled.current = params.newHabit;
    setEditing(true); setNewTitle(params.newHabit.slice(0, 60)); setNewTiny('');
  }, [state, params.newHabit]);

  const persist = async (next: HabitState, what: 'records' | 'config' | 'goal') => {
    setState(next); setSaveError(false);
    try { await (what === 'records' ? saveRecords(next.records) : what === 'config' ? saveConfig(next.config) : saveWeeklyGoal(next.weeklyGoal)); }
    catch { setSaveError(true); }
  };

  if (!state) {
    return <View style={[styles.container, styles.center]}>
      {loadError ? <>
        <Icon name="alert-circle-outline" size={30} color="#fca5a5" />
        <Text style={styles.errorTitle}>Couldn't open your habits</Text>
        <Text style={styles.muted}>Nothing has been changed. Try again in a moment.</Text>
        <TouchableOpacity style={styles.secondary} onPress={load}><Text style={styles.secondaryText}>Retry</Text></TouchableOpacity>
      </> : <ActivityIndicator color="#fbbf24" />}
    </View>;
  }

  const now = new Date();
  const today = dayKey(now);
  const defs = habitDefs(state.config);
  const week = lastDays(7, now);
  const shown = daysShownUp(defs, state.records, inputs, state.config.stepGoal, now);
  const shownCount = shown.filter(Boolean).length;
  const yesterdayRest = !shown[5] && !shown[6] && shown.slice(0, 5).some(Boolean);

  const toggle = (h: HabitDef) => {
    const mine = state.records[today] ?? [];
    const next = mine.includes(h.id) ? mine.filter((x) => x !== h.id) : [...mine, h.id];
    persist({ ...state, records: { ...state.records, [today]: next } }, 'records');
  };
  const setConfig = (config: HabitConfig) => persist({ ...state, config }, 'config');
  const toggleActive = (id: string) => {
    const on = state.config.active.includes(id);
    if (!on && state.config.active.length >= MAX_ACTIVE) { Alert.alert('Five is plenty', `Keep it to ${MAX_ACTIVE} habits or fewer. Remove one to add another.`); return; }
    setConfig({ ...state.config, active: on ? state.config.active.filter((x) => x !== id) : [...state.config.active, id] });
  };
  const addCustom = () => {
    const title = newTitle.trim();
    if (!title) return;
    if (state.config.active.length >= MAX_ACTIVE) { Alert.alert('Five is plenty', `Keep it to ${MAX_ACTIVE} habits or fewer. Remove one to add another.`); return; }
    const id = newCustomId();
    setConfig({ ...state.config, custom: [...state.config.custom, { id, title: title.slice(0, 60), tiny: newTiny.trim().slice(0, 80) }], active: [...state.config.active, id] });
    setNewTitle(''); setNewTiny('');
  };
  const removeCustom = (id: string) => Alert.alert('Remove this habit?', 'Past days stay in your history.', [
    { text: 'Keep it', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: () => setConfig({ ...state.config, custom: state.config.custom.filter((c) => c.id !== id), active: state.config.active.filter((x) => x !== id) }) },
  ]);
  const showSteps = state.config.active.includes('movement') && healthAvailable();

  return <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <View style={styles.header}><Icon name="flag-outline" size={30} color="#fbbf24" /><Text style={styles.title}>Habits and goals</Text><Text style={styles.subtitle}>A few small actions you choose. On hard days, the tiny version counts.</Text></View>

    <View style={styles.weekCard}>
      <Text style={styles.weekTitle}>You showed up on {shownCount} of the last 7 days</Text>
      <View style={styles.weekRow}>{week.map((d, i) => <View key={i} style={styles.weekDay}>
        <View style={[styles.weekDot, shown[i] && styles.weekDotOn, i === 6 && styles.weekDotToday]}>{shown[i] ? <Icon name="checkmark" size={14} color="#052e2b" /> : null}</View>
        <Text style={[styles.weekLetter, i === 6 && styles.weekLetterToday]}>{DAY_LETTERS[d.getDay()]}</Text>
      </View>)}</View>
      <Text style={styles.weekAim}>{shownCount >= state.weeklyGoal ? `You've reached your aim of ${state.weeklyGoal} days.` : `Your aim: ${state.weeklyGoal} days a week. Any habit, even the tiny version, counts.`}</Text>
    </View>
    {yesterdayRest ? <View style={styles.rest}><Icon name="sunny-outline" size={18} color="#fcd34d" /><Text style={styles.restText}>Yesterday was a rest day. Today, the tiny version is enough.</Text></View> : null}

    <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Today</Text><TouchableOpacity onPress={() => setEditing(!editing)} accessibilityRole="button"><Text style={styles.link}>{editing ? 'Done editing' : 'Choose habits'}</Text></TouchableOpacity></View>
    {defs.length === 0 ? <Text style={styles.muted}>No habits chosen. Tap "Choose habits" to pick one or two.</Text> : null}
    {defs.map((h) => {
      const auto = autoReason(h, today, today, inputs, state.config.stepGoal);
      const mine = !!state.records[today]?.includes(h.id);
      const done = mine || !!auto;
      return <TouchableOpacity key={h.id} style={styles.habit} onPress={() => (auto && !mine ? undefined : toggle(h))} activeOpacity={auto && !mine ? 1 : 0.7}
        accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityHint={auto && !mine ? 'Done automatically from your activity today' : undefined}>
        <View style={[styles.icon, { backgroundColor: `${h.color}22` }]}><Icon name={h.icon as any} size={22} color={h.color} /></View>
        <View style={styles.habitBody}>
          <Text style={styles.habitTitle}>{h.title}</Text>
          {auto && !mine ? <Text style={styles.autoText}>Done: {auto}</Text> : h.tiny ? <Text style={styles.tiny}>Tiny version: {h.tiny}</Text> : null}
          <View style={styles.dots}>{week.map((d, i) => <View key={i} style={[styles.dot, doneOn(h, dayKey(d), today, state.records, inputs, state.config.stepGoal) && { backgroundColor: h.color }]} />)}</View>
        </View>
        <Icon name={done ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={done ? '#34d399' : '#64748b'} />
      </TouchableOpacity>;
    })}
    {saveError ? <Text style={styles.error}>Couldn't save on this phone. Please try again.</Text> : null}

    {editing ? <View style={styles.editCard}>
      <Text style={styles.editTitle}>Choose up to {MAX_ACTIVE}</Text>
      <Text style={styles.muted}>Fewer habits are easier to keep. Some tick themselves when you use the app.</Text>
      {LIBRARY.map((h) => { const on = state.config.active.includes(h.id); return <TouchableOpacity key={h.id} style={styles.pickRow} onPress={() => toggleActive(h.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
        <Icon name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? '#fbbf24' : '#64748b'} />
        <View style={{ flex: 1 }}><Text style={styles.pickTitle}>{h.title}</Text><Text style={styles.pickDetail}>{h.auto === 'activity' ? 'Ticks itself after breathing, meditation, sounds, tea or a pause' : h.auto === 'steps' ? 'Ticks itself from Apple Health steps, if connected' : h.auto === 'sleep_reset' ? 'Ticks itself when you do tonight’s Sleep reset' : h.auto === 'journal' ? 'Ticks itself when you write in Journal' : h.auto === 'mood' ? 'Ticks itself when you log your mood' : `Tiny version: ${h.tiny}`}</Text></View>
      </TouchableOpacity>; })}
      {state.config.custom.map((c) => { const on = state.config.active.includes(c.id); return <View key={c.id} style={styles.pickRow}>
        <TouchableOpacity onPress={() => toggleActive(c.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}><Icon name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? '#fbbf24' : '#64748b'} /></TouchableOpacity>
        <View style={{ flex: 1 }}><Text style={styles.pickTitle}>{c.title}</Text>{c.tiny ? <Text style={styles.pickDetail}>Tiny version: {c.tiny}</Text> : null}</View>
        <TouchableOpacity onPress={() => removeCustom(c.id)} accessibilityLabel={`Remove ${c.title}`}><Icon name="trash-outline" size={18} color="#94a3b8" /></TouchableOpacity>
      </View>; })}
      <Text style={styles.addLabel}>Add your own</Text>
      <TextInput style={styles.input} value={newTitle} onChangeText={setNewTitle} maxLength={60} placeholder="For example: Go for a 10 minute walk" placeholderTextColor="#64748b" />
      <TextInput style={styles.input} value={newTiny} onChangeText={setNewTiny} maxLength={80} placeholder="Tiny version (optional), e.g. walk to the corner" placeholderTextColor="#64748b" />
      <TouchableOpacity style={[styles.primary, !newTitle.trim() && styles.disabled]} disabled={!newTitle.trim()} onPress={addCustom} accessibilityRole="button"><Text style={styles.primaryText}>Add habit</Text></TouchableOpacity>
      {showSteps ? <>
        <Text style={styles.addLabel}>Movement counts from</Text>
        <View style={styles.chips}>{STEP_GOALS.map((g) => <TouchableOpacity key={g} onPress={() => setConfig({ ...state.config, stepGoal: g })} style={[styles.chip, state.config.stepGoal === g && styles.chipOn]}><Text style={[styles.chipText, state.config.stepGoal === g && styles.chipTextOn]}>{g.toLocaleString()} steps</Text></TouchableOpacity>)}</View>
      </> : null}
    </View> : null}

    <View style={styles.goalCard}>
      <Text style={styles.goalTitle}>Weekly aim</Text>
      <Text style={styles.goalText}>How many days a week you'd like to do at least one habit.</Text>
      <View style={styles.chips}>{[3, 4, 5, 7].map((g) => <TouchableOpacity key={g} onPress={() => persist({ ...state, weeklyGoal: g }, 'goal')} style={[styles.chip, state.weeklyGoal === g && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: state.weeklyGoal === g }}><Text style={[styles.chipText, state.weeklyGoal === g && styles.chipTextOn]}>{g} days</Text></TouchableOpacity>)}</View>
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 20, paddingBottom: 40 }, center: { justifyContent: 'center', alignItems: 'center', gap: 10 },
  header: { marginBottom: 20 }, title: { color: '#f8fafc', fontSize: 26, fontWeight: '700', marginTop: 12 }, subtitle: { color: '#94a3b8', lineHeight: 21, marginTop: 7 },
  weekCard: { backgroundColor: '#1d3a37', borderRadius: 18, padding: 18, marginBottom: 14 }, weekTitle: { color: '#ecfdf5', fontSize: 17, fontWeight: '700' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }, weekDay: { alignItems: 'center', gap: 6 },
  weekDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: '#2f6b5f', alignItems: 'center', justifyContent: 'center' }, weekDotOn: { backgroundColor: '#6ee7b7', borderColor: '#6ee7b7' }, weekDotToday: { borderWidth: 2, borderColor: '#a7f3d0' },
  weekLetter: { color: '#6b9e93', fontSize: 11, fontWeight: '700' }, weekLetterToday: { color: '#ecfdf5' }, weekAim: { color: '#a7f3d0', fontSize: 13, lineHeight: 19, marginTop: 14 },
  rest: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#3a2f12', borderRadius: 12, padding: 12, marginBottom: 14 }, restText: { color: '#fde68a', flex: 1, lineHeight: 19 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, marginBottom: 12 }, sectionTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '700' }, link: { color: '#fbbf24', fontWeight: '700' },
  habit: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 16, padding: 15, marginBottom: 10, gap: 13 },
  icon: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' }, habitBody: { flex: 1 }, habitTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '700' },
  tiny: { color: '#94a3b8', fontSize: 12, marginTop: 4 }, autoText: { color: '#6ee7b7', fontSize: 12, marginTop: 4, fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 5, marginTop: 9 }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#334155' },
  editCard: { backgroundColor: '#1e293b', borderRadius: 18, padding: 18, marginTop: 6 }, editTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#273449' }, pickTitle: { color: '#f8fafc', fontWeight: '700' }, pickDetail: { color: '#94a3b8', fontSize: 12, marginTop: 3, lineHeight: 17 },
  addLabel: { color: '#f8fafc', fontWeight: '700', marginTop: 18, marginBottom: 8 },
  input: { backgroundColor: '#0f172a', borderColor: '#334155', borderWidth: 1, borderRadius: 12, padding: 12, color: '#f8fafc', marginBottom: 8 },
  primary: { backgroundColor: '#f59e0b', borderRadius: 22, paddingVertical: 12, alignItems: 'center', marginTop: 4 }, primaryText: { color: '#1c1303', fontWeight: '800' }, disabled: { opacity: 0.45 },
  secondary: { borderColor: '#475569', borderWidth: 1, borderRadius: 22, paddingVertical: 10, paddingHorizontal: 20, marginTop: 8 }, secondaryText: { color: '#cbd5e1', fontWeight: '700' },
  goalCard: { backgroundColor: '#312e4d', borderRadius: 18, padding: 20, marginTop: 20 }, goalTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '700' }, goalText: { color: '#c4b5fd', marginTop: 7, lineHeight: 19 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }, chip: { borderWidth: 1, borderColor: '#5b4b86', borderRadius: 18, paddingVertical: 8, paddingHorizontal: 12 }, chipOn: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }, chipText: { color: '#c4b5fd', fontSize: 12, fontWeight: '700' }, chipTextOn: { color: '#fff' },
  muted: { color: '#94a3b8', lineHeight: 19, textAlign: 'left' }, errorTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '700' }, error: { color: '#fca5a5', marginTop: 4 },
});
