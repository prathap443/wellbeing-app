import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { parseEntryDate } from '../lib/dates';
import { formatSleep, formatSteps, healthDayKey } from '../lib/health';
import { entryId, type JournalEntry as SavedJournalEntry } from '../lib/journal';
import { useHealth } from '../lib/useHealth';

// Everything here is read from data already saved on the device. Nothing new is collected.

type MoodEntry = { mood: string; note?: string; date: string; timestamp?: string };
type CheckIn = { sleep: number; energy: number; stress: number; date: string; createdAt?: string };
type JournalEntry = { date: string; text?: string; situation?: string; nextStep?: string };

const MOODS: Record<string, { label: string; icon: string; color: string; score: number }> = {
  great: { label: 'Great', icon: 'happy-outline', color: '#10b981', score: 5 },
  good: { label: 'Good', icon: 'happy-outline', color: '#f59e0b', score: 4 },
  okay: { label: 'Okay', icon: 'remove-outline', color: '#94a3b8', score: 3 },
  bad: { label: 'Bad', icon: 'sad-outline', color: '#f87171', score: 2 },
  very_bad: { label: 'Very bad', icon: 'sad-outline', color: '#60a5fa', score: 1 },
};
const MOOD_ORDER = ['great', 'good', 'okay', 'bad', 'very_bad'];
const moodFor = (score: number) => MOOD_ORDER.find((id) => MOODS[id].score === Math.round(score)) ?? 'okay';

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const valid = (d: Date) => !Number.isNaN(d.getTime());
const parseJSON = <T,>(raw: string | null, fallback: T): T => { try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } };

function dayLabel(d: Date): string {
  const today = startOfDay(new Date());
  const diff = Math.round((today.getTime() - startOfDay(d).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

type TimelineItem =
  | { kind: 'mood'; at: Date; mood: string; note?: string }
  | { kind: 'checkin'; at: Date; sleep: number; energy: number; stress: number }
  | { kind: 'journal'; at: Date; title: string; nextStep?: string; id: string }
  | { kind: 'habits'; at: Date; count: number };
type Filter = 'all' | 'mood' | 'checkin' | 'journal';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'mood', label: 'Moods' }, { id: 'checkin', label: 'Check-ins' }, { id: 'journal', label: 'Journal' },
];
const PAGE_DAYS = 30;

export default function HistoryScreen() {
  const navigation = useNavigation<any>();
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [habits, setHabits] = useState<Record<string, string[]>>({});
  const [month, setMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  const [filter, setFilter] = useState<Filter>('all');
  const [days, setDays] = useState(PAGE_DAYS);
  const health = useHealth(navigation);

  const load = useCallback(async () => {
    const pairs = await AsyncStorage.multiGet(['mood_entries', 'daily_check_ins', 'journal_entries', 'habit_records']).catch(() => []);
    const get = (key: string) => pairs.find(([k]) => k === key)?.[1] ?? null;
    setMoods(parseJSON<MoodEntry[]>(get('mood_entries'), []).filter((m) => m && MOODS[m.mood]));
    setCheckIns(parseJSON<CheckIn[]>(get('daily_check_ins'), []));
    setJournal(parseJSON<JournalEntry[]>(get('journal_entries'), []));
    setHabits(parseJSON<Record<string, string[]>>(get('habit_records'), {}));
  }, []);

  // Tabs stay mounted, so reload whenever the tab is shown.
  useEffect(() => navigation.addListener('focus', load), [navigation, load]);

  // ---------- Mood by day (average of that day's entries) ----------
  const moodByDay = useMemo(() => {
    const sums = new Map<string, { total: number; count: number }>();
    for (const m of moods) {
      const d = parseEntryDate(m);
      if (!valid(d)) continue;
      const k = dayKey(d);
      const s = sums.get(k) ?? { total: 0, count: 0 };
      s.total += MOODS[m.mood].score; s.count += 1;
      sums.set(k, s);
    }
    return new Map([...sums].map(([k, s]) => [k, moodFor(s.total / s.count)]));
  }, [moods]);

  // ---------- Calendar ----------
  const calendar = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const lead = (first.getDay() + 6) % 7; // Monday first
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
    for (let i = 1; i <= count; i++) cells.push(new Date(month.getFullYear(), month.getMonth(), i));
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [month]);
  const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const atCurrentMonth = month.getTime() >= thisMonth.getTime();
  const loggedThisMonth = calendar.filter((d) => d && moodByDay.has(dayKey(d))).length;
  const todayKey = dayKey(new Date());

  // ---------- Last 14 days of check-ins ----------
  const trend = useMemo(() => {
    const byDay = new Map<string, CheckIn>();
    for (const c of checkIns) {
      const d = c.createdAt ? new Date(c.createdAt) : parseEntryDate({ date: c.date });
      if (valid(d) && !byDay.has(dayKey(d))) byDay.set(dayKey(d), c);
    }
    const today = startOfDay(new Date());
    const window = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13)).map((d) => ({ d, c: byDay.get(dayKey(d)) }));
    const present = window.filter((w) => w.c);
    const avg = (key: 'sleep' | 'energy' | 'stress') => present.length ? present.reduce((t, w) => t + w.c![key], 0) / present.length : 0;
    return { window, count: present.length, sleep: avg('sleep'), energy: avg('energy'), stress: avg('stress') };
  }, [checkIns]);

  // ---------- Last 7 days summary ----------
  const week = useMemo(() => {
    const since = addDays(startOfDay(new Date()), -6);
    const inWeek = (d: Date) => valid(d) && d >= since;
    return {
      moods: moods.filter((m) => inWeek(parseEntryDate(m))).length,
      checkIns: checkIns.filter((c) => inWeek(c.createdAt ? new Date(c.createdAt) : parseEntryDate({ date: c.date }))).length,
      habitDays: Object.entries(habits).filter(([k, ids]) => ids?.length && inWeek(parseEntryDate({ date: k }))).length,
      reflections: journal.filter((j) => inWeek(parseEntryDate(j))).length,
    };
  }, [moods, checkIns, habits, journal]);

  // ---------- Timeline ----------
  const timeline = useMemo(() => {
    const items: TimelineItem[] = [];
    for (const m of moods) { const at = parseEntryDate(m); if (valid(at)) items.push({ kind: 'mood', at, mood: m.mood, note: m.note?.trim() || undefined }); }
    for (const c of checkIns) { const at = c.createdAt ? new Date(c.createdAt) : parseEntryDate({ date: c.date }); if (valid(at)) items.push({ kind: 'checkin', at, sleep: c.sleep, energy: c.energy, stress: c.stress }); }
    for (const j of journal) {
      const at = parseEntryDate(j);
      const title = (j.situation || j.text || '').trim();
      if (valid(at)) items.push({ kind: 'journal', at, title: title || 'Reflection', nextStep: j.nextStep?.trim() || undefined, id: entryId(j as SavedJournalEntry) });
    }
    for (const [k, ids] of Object.entries(habits)) { const at = parseEntryDate({ date: k }); if (valid(at) && ids?.length) items.push({ kind: 'habits', at, count: ids.length }); }
    const cutoff = addDays(startOfDay(new Date()), -(days - 1));
    const shown = items
      .filter((i) => filter === 'all' || i.kind === filter)
      .filter((i) => i.at >= cutoff)
      .sort((a, b) => b.at.getTime() - a.at.getTime());
    const olderExist = items.some((i) => (filter === 'all' || i.kind === filter) && i.at < cutoff);
    const groups: { label: string; items: TimelineItem[] }[] = [];
    for (const item of shown) {
      const label = dayLabel(item.at);
      if (groups.at(-1)?.label === label) groups.at(-1)!.items.push(item);
      else groups.push({ label, items: [item] });
    }
    return { groups, olderExist };
  }, [moods, checkIns, journal, habits, filter, days]);

  const hasAnything = moods.length + checkIns.length + journal.length + Object.keys(habits).length > 0;
  const goTo = (screen: string) => navigation.navigate('Home', { screen });

  return <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
    <Text style={styles.title}>History</Text>
    <Text style={styles.subtitle}>Your moods, check-ins and reflections over time.</Text>

    {/* Mood calendar */}
    <View style={styles.card}>
      <View style={styles.monthRow}>
        <TouchableOpacity onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} accessibilityLabel="Previous month" style={styles.monthButton}>
          <Icon name="chevron-back" size={20} color="#cbd5e1" />
        </TouchableOpacity>
        <View style={styles.monthTitleBox}>
          <Text style={styles.monthTitle}>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text>
          <Text style={styles.monthMeta}>{loggedThisMonth} {loggedThisMonth === 1 ? 'day' : 'days'} logged</Text>
        </View>
        <TouchableOpacity onPress={() => !atCurrentMonth && setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} disabled={atCurrentMonth} accessibilityLabel="Next month" style={[styles.monthButton, atCurrentMonth && styles.disabled]}>
          <Icon name="chevron-forward" size={20} color="#cbd5e1" />
        </TouchableOpacity>
      </View>
      <View style={styles.weekRow}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <Text key={i} style={styles.weekday}>{d}</Text>)}</View>
      <View style={styles.grid}>
        {calendar.map((d, i) => {
          if (!d) return <View key={i} style={styles.cell} />;
          const mood = moodByDay.get(dayKey(d));
          const isToday = dayKey(d) === todayKey;
          const isFuture = d.getTime() > Date.now();
          return <View key={i} style={[styles.cell, isFuture && styles.future]}>
            <View style={[styles.dayDot, mood ? { backgroundColor: MOODS[mood].color } : styles.dayEmpty, isToday && styles.today]}
              accessibilityLabel={`${d.toLocaleDateString()}${mood ? `, ${MOODS[mood].label}` : ''}`}>
              <Text style={[styles.dayText, mood ? styles.dayTextOn : null]}>{d.getDate()}</Text>
            </View>
          </View>;
        })}
      </View>
      <View style={styles.legend}>
        {MOOD_ORDER.map((id) => <View key={id} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: MOODS[id].color }]} /><Text style={styles.legendText}>{MOODS[id].label}</Text></View>)}
      </View>
    </View>

    {/* Last 7 days */}
    <Text style={styles.section}>Last 7 days</Text>
    <View style={styles.tiles}>
      {[
        { icon: 'happy-outline', color: '#10b981', value: week.moods, label: 'Moods' },
        { icon: 'pulse-outline', color: '#60a5fa', value: week.checkIns, label: 'Check-ins' },
        { icon: 'checkmark-done-outline', color: '#f59e0b', value: week.habitDays, label: 'Habit days' },
        { icon: 'book-outline', color: '#c084fc', value: week.reflections, label: 'Reflections' },
      ].map((t) => <View key={t.label} style={styles.tile}>
        <Icon name={t.icon as any} size={18} color={t.color} />
        <Text style={styles.tileValue}>{t.value}</Text>
        <Text style={styles.tileLabel}>{t.label}</Text>
      </View>)}
    </View>

    {/* Check-in trends */}
    <Text style={styles.section}>Sleep, energy and stress</Text>
    {trend.count === 0 ? <TouchableOpacity style={styles.prompt} onPress={() => goTo('CheckIn')} accessibilityRole="button">
      <Icon name="pulse-outline" size={22} color="#60a5fa" />
      <View style={styles.promptBody}>
        <Text style={styles.promptTitle}>See your patterns here</Text>
        <Text style={styles.promptText}>A 20-second daily check-in builds a 14-day view of your sleep, energy and stress.</Text>
      </View>
      <Icon name="chevron-forward" size={18} color="#64748b" />
    </TouchableOpacity> : <View style={styles.card}>
      {([['sleep', 'Sleep quality', '#818cf8'], ['energy', 'Energy', '#34d399'], ['stress', 'Stress', '#fb923c']] as const).map(([key, label, color]) =>
        <View key={key} style={styles.trendRow}>
          <View style={styles.trendHead}>
            <Text style={styles.trendLabel}>{label}</Text>
            <Text style={[styles.trendAvg, { color }]}>avg {trend[key].toFixed(1)}/5</Text>
          </View>
          <View style={styles.bars}>
            {trend.window.map(({ d, c }) => <View key={dayKey(d)} style={styles.barSlot}>
              <View style={[styles.bar, c ? { height: `${(c[key] / 5) * 100}%`, backgroundColor: color } : styles.barEmpty]} />
            </View>)}
          </View>
        </View>)}
      <View style={styles.trendFoot}><Text style={styles.trendFootText}>14 days ago</Text><Text style={styles.trendFootText}>{trend.count} check-in{trend.count === 1 ? '' : 's'}</Text><Text style={styles.trendFootText}>Today</Text></View>
    </View>}

    {/* Apple Health (iPhone only, read-only, stays on this device) */}
    {health.available ? <>
      <Text style={styles.section}>Sleep and steps</Text>
      {!health.connected ? <TouchableOpacity style={styles.prompt} onPress={health.connect} accessibilityRole="button">
        <Icon name="heart-circle-outline" size={24} color="#f472b6" />
        <View style={styles.promptBody}>
          <Text style={styles.promptTitle}>Connect Apple Health</Text>
          <Text style={styles.promptText}>See your sleep and steps next to your moods. Read-only, and it stays on this phone.</Text>
        </View>
        <Icon name="chevron-forward" size={18} color="#64748b" />
      </TouchableOpacity> : !health.data ? <Text style={styles.none}>Loading Apple Health…</Text> : !health.hasData ? <View style={styles.prompt}>
        <Icon name="information-circle-outline" size={22} color="#94a3b8" />
        <View style={styles.promptBody}>
          <Text style={styles.promptTitle}>No sleep or step data yet</Text>
          <Text style={styles.promptText}>If you didn't allow access, turn it on in Settings → Privacy & Security → Health → Wellbeing. Sleep needs Apple Watch or a sleep schedule in the Health app.</Text>
        </View>
      </View> : <HealthCharts data={health.data} />}
    </> : null}

    {/* Timeline */}
    <Text style={styles.section}>Timeline</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
      {FILTERS.map((f) => <TouchableOpacity key={f.id} onPress={() => { setFilter(f.id); setDays(PAGE_DAYS); }} style={[styles.chip, filter === f.id && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: filter === f.id }}>
        <Text style={[styles.chipText, filter === f.id && styles.chipTextOn]}>{f.label}</Text>
      </TouchableOpacity>)}
    </ScrollView>

    {!hasAnything ? <View style={styles.empty}>
      <Icon name="leaf-outline" size={36} color="#64748b" />
      <Text style={styles.emptyTitle}>Your story starts here</Text>
      <Text style={styles.emptyText}>Log a mood or do a check-in, and your history will build up day by day.</Text>
      <View style={styles.emptyButtons}>
        <TouchableOpacity style={styles.emptyPrimary} onPress={() => navigation.navigate('Home', { screen: 'Home' })}><Text style={styles.emptyPrimaryText}>Log a mood</Text></TouchableOpacity>
        <TouchableOpacity style={styles.emptySecondary} onPress={() => goTo('CheckIn')}><Text style={styles.emptySecondaryText}>Daily check-in</Text></TouchableOpacity>
      </View>
    </View> : timeline.groups.length === 0 ? <Text style={styles.none}>Nothing here in the last {days} days.</Text> : timeline.groups.map((g) => <View key={g.label}>
      <Text style={styles.dayHeading}>{g.label}</Text>
      {g.items.map((item, i) => <TimelineRow key={`${g.label}-${i}`} item={item} onOpenJournal={(id) => navigation.navigate('Home', { screen: 'Journal', params: { openId: id } })} />)}
    </View>)}
    {hasAnything && timeline.olderExist ? <TouchableOpacity style={styles.more} onPress={() => setDays(days + PAGE_DAYS)}><Text style={styles.moreText}>Show earlier</Text></TouchableOpacity> : null}
  </ScrollView>;
}

function HealthCharts({ data }: { data: import('../lib/health').HealthDay[] }) {
  const sleeps = data.filter((d) => d.sleepMinutes !== null).map((d) => d.sleepMinutes!);
  const steps = data.filter((d) => d.steps !== null).map((d) => d.steps!);
  const avgSleep = sleeps.length ? Math.round(sleeps.reduce((a, b) => a + b, 0) / sleeps.length) : null;
  const avgSteps = steps.length ? Math.round(steps.reduce((a, b) => a + b, 0) / steps.length) : null;
  const stepMax = Math.max(10000, ...steps);
  const inBedOnly = data.some((d) => d.sleepIsInBed);
  const rows = [
    { label: 'Time asleep', color: '#818cf8', avg: avgSleep !== null ? `avg ${formatSleep(avgSleep)}` : 'no data', value: (d: typeof data[number]) => d.sleepMinutes === null ? null : Math.min(1, d.sleepMinutes / 600) },
    { label: 'Steps', color: '#f472b6', avg: avgSteps !== null ? `avg ${formatSteps(avgSteps)}` : 'no data', value: (d: typeof data[number]) => d.steps === null ? null : Math.min(1, d.steps / stepMax) },
  ];
  return <View style={styles.card}>
    {rows.map((r) => <View key={r.label} style={styles.trendRow}>
      <View style={styles.trendHead}><Text style={styles.trendLabel}>{r.label}</Text><Text style={[styles.trendAvg, { color: r.color }]}>{r.avg}</Text></View>
      <View style={styles.bars}>
        {data.map((d) => { const v = r.value(d); return <View key={healthDayKey(d.date)} style={styles.barSlot}>
          <View style={[styles.bar, v !== null ? { height: `${Math.max(v, 0.06) * 100}%`, backgroundColor: r.color } : styles.barEmpty]} />
        </View>; })}
      </View>
    </View>)}
    <View style={styles.trendFoot}><Text style={styles.trendFootText}>14 days ago</Text><Text style={styles.trendFootText}>From Apple Health</Text><Text style={styles.trendFootText}>Today</Text></View>
    {inBedOnly ? <Text style={styles.healthNote}>Some nights show time in bed, because no sleep stages were recorded.</Text> : null}
  </View>;
}

function TimelineRow({ item, onOpenJournal }: { item: TimelineItem; onOpenJournal: (id: string) => void }) {
  const time = item.kind === 'habits' ? null : item.at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const showTime = time && time !== '00:00' && time !== '12:00 AM';
  if (item.kind === 'mood') {
    const m = MOODS[item.mood];
    return <View style={[styles.row, { borderLeftColor: m.color }]}>
      <Icon name={m.icon as any} size={22} color={m.color} />
      <View style={styles.rowBody}>
        <View style={styles.rowHead}><Text style={styles.rowTitle}>Felt {m.label.toLowerCase()}</Text>{showTime ? <Text style={styles.rowTime}>{time}</Text> : null}</View>
        {item.note ? <Text style={styles.rowText}>{item.note}</Text> : null}
      </View>
    </View>;
  }
  if (item.kind === 'checkin') {
    return <View style={[styles.row, { borderLeftColor: '#60a5fa' }]}>
      <Icon name="pulse-outline" size={22} color="#60a5fa" />
      <View style={styles.rowBody}>
        <View style={styles.rowHead}><Text style={styles.rowTitle}>Daily check-in</Text>{showTime ? <Text style={styles.rowTime}>{time}</Text> : null}</View>
        <View style={styles.pills}>
          <Text style={styles.pill}>Sleep {item.sleep}/5</Text><Text style={styles.pill}>Energy {item.energy}/5</Text><Text style={styles.pill}>Stress {item.stress}/5</Text>
        </View>
      </View>
    </View>;
  }
  if (item.kind === 'journal') {
    return <TouchableOpacity style={[styles.row, { borderLeftColor: '#c084fc' }]} onPress={() => onOpenJournal(item.id)} accessibilityRole="button" accessibilityHint="Opens the full reflection">
      <Icon name="book-outline" size={22} color="#c084fc" />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>{item.title}</Text>
        {item.nextStep ? <Text style={styles.rowText} numberOfLines={2}>Next step: {item.nextStep}</Text> : null}
      </View>
      <Icon name="chevron-forward" size={18} color="#64748b" />
    </TouchableOpacity>;
  }
  return <View style={[styles.row, { borderLeftColor: '#f59e0b' }]}>
    <Icon name="checkmark-done-outline" size={22} color="#f59e0b" />
    <View style={styles.rowBody}><Text style={styles.rowTitle}>{item.count} habit{item.count === 1 ? '' : 's'} completed</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 20, paddingTop: 56, paddingBottom: 48 },
  title: { color: '#f8fafc', fontSize: 28, fontWeight: '800' }, subtitle: { color: '#94a3b8', marginTop: 4, marginBottom: 18 },
  card: { backgroundColor: '#1e293b', borderRadius: 18, padding: 16 },
  monthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 }, monthButton: { padding: 6 }, disabled: { opacity: 0.3 },
  monthTitleBox: { flex: 1, alignItems: 'center' }, monthTitle: { color: '#f8fafc', fontWeight: '800', fontSize: 16 }, monthMeta: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  weekRow: { flexDirection: 'row' }, weekday: { width: `${100 / 7}%`, textAlign: 'center', color: '#64748b', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' }, cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 }, future: { opacity: 0.35 },
  dayDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, dayEmpty: { backgroundColor: '#0f172a' },
  today: { borderWidth: 2, borderColor: '#f8fafc' }, dayText: { color: '#64748b', fontSize: 13, fontWeight: '600' }, dayTextOn: { color: '#0f172a', fontWeight: '800' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 12 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 }, legendText: { color: '#94a3b8', fontSize: 12 },
  section: { color: '#f8fafc', fontSize: 17, fontWeight: '800', marginTop: 26, marginBottom: 12 },
  tiles: { flexDirection: 'row', gap: 10 }, tile: { flex: 1, backgroundColor: '#1e293b', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  tileValue: { color: '#f8fafc', fontSize: 22, fontWeight: '800', marginTop: 6 }, tileLabel: { color: '#94a3b8', fontSize: 11, marginTop: 2, textAlign: 'center' },
  prompt: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1e293b', borderRadius: 16, padding: 16 },
  promptBody: { flex: 1 }, promptTitle: { color: '#f8fafc', fontWeight: '700' }, promptText: { color: '#94a3b8', fontSize: 13, lineHeight: 18, marginTop: 3 },
  trendRow: { marginBottom: 14 }, trendHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  trendLabel: { color: '#e2e8f0', fontWeight: '700', fontSize: 13 }, trendAvg: { fontWeight: '800', fontSize: 13 },
  bars: { flexDirection: 'row', height: 44, alignItems: 'flex-end', gap: 4 }, barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4, minHeight: 4 }, barEmpty: { height: 4, backgroundColor: '#334155' },
  trendFoot: { flexDirection: 'row', justifyContent: 'space-between' }, trendFootText: { color: '#64748b', fontSize: 11 },
  filters: { gap: 8, paddingBottom: 4 }, chip: { borderWidth: 1, borderColor: '#334155', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: '#10b981', borderColor: '#10b981' }, chipText: { color: '#cbd5e1', fontWeight: '600', fontSize: 13 }, chipTextOn: { color: '#022c22' },
  dayHeading: { color: '#94a3b8', fontSize: 13, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12, backgroundColor: '#1e293b', borderRadius: 14, padding: 14, marginBottom: 8, borderLeftWidth: 3 },
  rowBody: { flex: 1 }, rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitle: { color: '#f1f5f9', fontWeight: '700', flexShrink: 1 }, rowTime: { color: '#64748b', fontSize: 12 }, rowText: { color: '#94a3b8', marginTop: 4, lineHeight: 19 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }, pill: { color: '#cbd5e1', backgroundColor: '#0f172a', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, fontSize: 12, overflow: 'hidden' },
  empty: { alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 18, padding: 24, marginTop: 8 },
  emptyTitle: { color: '#f8fafc', fontWeight: '800', fontSize: 17, marginTop: 10 }, emptyText: { color: '#94a3b8', textAlign: 'center', lineHeight: 20, marginTop: 6 },
  emptyButtons: { flexDirection: 'row', gap: 10, marginTop: 16 }, emptyPrimary: { backgroundColor: '#10b981', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 11 },
  emptyPrimaryText: { color: '#022c22', fontWeight: '800' }, emptySecondary: { borderWidth: 1, borderColor: '#334155', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 11 },
  emptySecondaryText: { color: '#e2e8f0', fontWeight: '700' },
  none: { color: '#64748b', textAlign: 'center', marginTop: 16 },
  healthNote: { color: '#64748b', fontSize: 12, marginTop: 8, lineHeight: 17 },
  more: { alignItems: 'center', padding: 14 }, moreText: { color: '#6ee7b7', fontWeight: '700' },
});
