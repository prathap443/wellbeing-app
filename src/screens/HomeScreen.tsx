import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons as Icon } from '@expo/vector-icons';
import { calculateStreaks } from '../lib/dates';
import { isCoachConfigured } from '../lib/coach';
import { useSession } from '../lib/session';
import { formatSleep, formatSteps } from '../lib/health';
import { useHealth } from '../lib/useHealth';
import WhatHelpsCard from '../components/WhatHelpsCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type RootStackParamList = {
  Home: undefined;
  History: undefined;
  Insights: undefined;
  Settings: undefined;
  CheckIn: undefined;
  Journal: undefined;
  Breathe: undefined;
  Resources: undefined;
  Goals: undefined;
  Planner: undefined;
  Meditation: undefined;
  TherapyCompanion: undefined;
  SupportGuidance: undefined;
  Coach: undefined;
  Subscription: undefined;
  AnxietySupport: undefined;
  BubbleRelease: undefined;
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface MoodOption {
  id: string;
  icon: string;
  label: string;
  color: string;
}

interface MoodEntry {
  mood: string;
  note: string;
  date: string;
  timestamp?: string;
}

const MOOD_OPTIONS: MoodOption[] = [
  { id: 'great', icon: 'happy-outline', label: 'Great', color: '#10b981' },
  { id: 'good', icon: 'happy-outline', label: 'Good', color: '#f59e0b' },
  { id: 'okay', icon: 'remove-outline', label: 'Okay', color: '#6b7280' },
  { id: 'bad', icon: 'sad-outline', label: 'Bad', color: '#f87171' },
  { id: 'very_bad', icon: 'sad-outline', label: 'Very Bad', color: '#3b82f6' },
];

const MOOD_ICONS: Record<string, string> = {
  'great': 'happy-outline',
  'good': 'happy-outline',
  'okay': 'remove-outline',
  'bad': 'sad-outline',
  'very_bad': 'sad-outline',
};

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const health = useHealth(navigation, 2);
  const { plus } = useSession();
  const [mood, setMood] = useState<string | null>(null);
  const [note, setNote] = useState<string>('');
  const [savedEntries, setSavedEntries] = useState<MoodEntry[]>([]);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const todayEntries = savedEntries.filter((entry) => entry.date === new Date().toLocaleDateString()).length;
  const streak = calculateStreaks(savedEntries).current;

  useEffect(() => {
    // Reload whenever the screen regains focus so changes elsewhere (e.g. clearing data) show up.
    return navigation.addListener('focus', loadEntries);
  }, [navigation]);

  const loadEntries = async () => {
    try {
      const stored = await AsyncStorage.getItem('mood_entries');
      setSavedEntries(stored ? JSON.parse(stored) : []);
    } catch (e) {
      console.error('Failed to load entries', e);
    }
  };

  const saveEntry = async () => {
    if (!mood) {
      Alert.alert('Select a mood', 'Please select how you are feeling');
      return;
    }
    const entry = { mood, note: note || '', date: new Date().toLocaleDateString(), timestamp: new Date().toISOString() };
    const updated = [entry, ...savedEntries]; // keep every mood entry: no silent removal of older ones
    await AsyncStorage.setItem('mood_entries', JSON.stringify(updated));
    setSavedEntries(updated);
    setMood(null);
    setNote('');
    Alert.alert('Saved', 'Your mood has been logged!');
  };

  const getMoodIcon = (moodId: string) => MOOD_ICONS[moodId] || 'happy-outline';
  const getMoodColor = (moodId: string) => {
    const found = MOOD_OPTIONS.find(m => m.id === moodId);
    return found ? found.color : '#10b981';
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={styles.header}>
        <View style={styles.heroOrbOne} />
        <View style={styles.heroOrbTwo} />
        <View style={styles.heroTopRow}>
          <View style={styles.brandPill}><Icon name="sparkles-outline" size={15} color="#bbf7d0" /><Text style={styles.brandText}>WELLBEING</Text></View>
          <TouchableOpacity style={styles.helpPill} onPress={() => navigation.navigate('SupportGuidance')} accessibilityRole="button" accessibilityLabel="Get help now"><Icon name="heart" size={13} color="#4c0519" /><Text style={styles.helpPillText}>Get help</Text></TouchableOpacity>
        </View>
        <Text style={styles.heroGreeting}>{greeting}</Text>
        <Text style={styles.heroTitle}>Make room for{`\n`}yourself today.</Text>
        <Text style={styles.heroSubtitle}>A few minutes to notice, reset, and plan around the energy you have.</Text>
        <View style={styles.heroMetrics}>
          <View><Text style={styles.heroMetricValue}>{todayEntries}</Text><Text style={styles.heroMetricLabel}>Check-ins today</Text></View>
          <View style={styles.heroMetricDivider} />
          <View><Text style={styles.heroMetricValue}>{savedEntries.length}</Text><Text style={styles.heroMetricLabel}>Moments logged</Text></View>
          <TouchableOpacity style={styles.heroAction} onPress={() => navigation.navigate('Planner')}><Icon name="calendar-outline" size={19} color="#052e2b" /></TouchableOpacity>
        </View>
      </View>
      
      {/* Mood Selection */}
      <View style={styles.section}>
        <Text style={styles.checkInTitle}>Take a quick check-in</Text>
        <Text style={styles.checkInSubtitle}>There is no right answer. Choose what feels closest.</Text>
        <View style={styles.moodGrid}>
          {MOOD_OPTIONS.map((m, idx) => (
            <TouchableOpacity
              key={`${m.id}-${idx}`}
              onPress={() => setMood(m.id)}
              accessibilityRole="button"
              accessibilityLabel={`Mood: ${m.label}`}
              accessibilityState={{ selected: mood === m.id }}
              style={[
                styles.moodButton,
                { backgroundColor: mood === m.id ? m.color : '#1e293b' },
                mood === m.id && { borderWidth: 2, borderColor: m.color }
              ]}
            >
              <Icon name={m.icon as any} size={28} color={mood === m.id ? '#fff' : m.color} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Note Input */}
      <View style={styles.section}>
        <TextInput
          style={styles.textInput}
          value={note}
          onChangeText={setNote}
          placeholder="Add a note (optional)..."
          multiline
          placeholderTextColor='#64748b'
        />
      </View>
      
      {/* Log Button */}
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: mood ? '#10b981' : '#334155' }
        ]}
        onPress={saveEntry}
        disabled={!mood}
      >
        <Text style={styles.buttonText}>Log My Mood</Text>
      </TouchableOpacity>

      {isCoachConfigured() ? (
        <TouchableOpacity style={styles.coachCard} onPress={() => navigation.navigate('Coach')} accessibilityRole="button">
          <View style={styles.coachIcon}><Icon name="sparkles" size={22} color="#bbf7d0" /></View>
          <View style={styles.coachBody}>
            <Text style={styles.coachTitle}>Your AI coach</Text>
            <Text style={styles.coachText}>Questions picked for how you're feeling today</Text>
          </View>
          <Icon name="chevron-forward-outline" size={20} color="#99f6e4" />
        </TouchableOpacity>
      ) : null}

      <WhatHelpsCard />

      {health.connected && health.hasData && health.data ? (() => {
        const today = health.data[health.data.length - 1];
        const parts = [
          today.sleepMinutes !== null ? `Last night ${formatSleep(today.sleepMinutes)}` : null,
          today.steps !== null ? `Today ${formatSteps(today.steps)} steps` : null,
        ].filter(Boolean);
        return parts.length ? <TouchableOpacity style={styles.healthCard} onPress={() => (navigation as any).navigate('History')} accessibilityRole="button" accessibilityLabel={`${parts.join(', ')}. Open History`}>
          <Icon name="heart-circle-outline" size={20} color="#f472b6" />
          <Text style={styles.healthText}>{parts.join('  ·  ')}</Text>
          <Icon name="chevron-forward-outline" size={16} color="#64748b" />
        </TouchableOpacity> : null;
      })() : null}

      <View style={styles.toolsSection}>
        <Text style={styles.sectionTitle}>Wellbeing tools</Text>
        <View style={styles.toolGrid}>
          <TouchableOpacity style={styles.toolCard} onPress={() => navigation.navigate('CheckIn')}>
            <Icon name="pulse-outline" size={22} color="#34d399" />
            <Text style={styles.toolTitle}>Check-in</Text>
            <Text style={styles.toolText}>Sleep, energy, stress</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolCard} onPress={() => navigation.navigate('Journal')}>
            <Icon name="book-outline" size={22} color="#a78bfa" />
            <Text style={styles.toolTitle}>Journal</Text>
            <Text style={styles.toolText}>Reflect privately</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolCard} onPress={() => navigation.navigate('Breathe')}>
            <Icon name="leaf-outline" size={22} color="#5eead4" />
            <Text style={styles.toolTitle}>Breathe</Text>
            <Text style={styles.toolText}>Box breathing</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolCard} onPress={() => navigation.navigate('BubbleRelease')}>
            <Icon name="ellipse-outline" size={22} color="#7dd3fc" />
            <Text style={styles.toolTitle}>Bubble release</Text>
            <Text style={styles.toolText}>A calm 3-minute game</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolCard} onPress={() => navigation.navigate('Resources')}>
            <Icon name="compass-outline" size={22} color="#60a5fa" />
            <Text style={styles.toolTitle}>Support</Text>
            <Text style={styles.toolText}>Tools and guidance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolCard} onPress={() => navigation.navigate('Goals')}>
            <Icon name="flag-outline" size={22} color="#fbbf24" />
            <Text style={styles.toolTitle}>Habits and goals</Text>
            <Text style={styles.toolText}>Build daily routines</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolCard} onPress={() => navigation.navigate('Planner')}>
            <Icon name="calendar-outline" size={22} color="#60a5fa" />
            <Text style={styles.toolTitle}>Mental state planner</Text>
            <Text style={styles.toolText}>Plan for your capacity</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolCard} onPress={() => navigation.navigate('Meditation')}>
            <Icon name="headset-outline" size={22} color="#c4b5fd" />
            <Text style={styles.toolTitle}>Meditation studio</Text>
            <Text style={styles.toolText}>Guided mindful pauses</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolCard} onPress={() => navigation.navigate('TherapyCompanion')}>
            <Icon name="people-outline" size={22} color="#60a5fa" />
            <Text style={styles.toolTitle}>Therapy companion</Text>
            <Text style={styles.toolText}>Prepare and follow through</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolCard} onPress={() => navigation.navigate('Subscription')}>
            <Icon name="sparkles-outline" size={22} color="#fbbf24" />
            <Text style={styles.toolTitle}>Wellbeing Plus</Text>
            <Text style={styles.toolText}>{plus ? 'You are a member' : 'More coach time'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolCard} onPress={() => navigation.navigate('AnxietySupport')}>
            <Icon name="shield-outline" size={22} color="#93c5fd" />
            <Text style={styles.toolTitle}>Anxiety support</Text>
            <Text style={styles.toolText}>Reset and choose a next step</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{savedEntries.length}</Text>
          <Text style={styles.statLabel}>Total Entries</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {todayEntries}
          </Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>Day streak</Text>
        </View>
      </View>
      
      {/* Recent Entries */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Entries</Text>
          <TouchableOpacity onPress={() => navigation.navigate('History')}>
            <Text style={styles.viewAll}>View All →</Text>
          </TouchableOpacity>
        </View>
        {savedEntries.length === 0 ? (
          <Text style={styles.emptyText}>Start logging to see your history</Text>
        ) : (
          savedEntries.slice(0, 4).map((entry, i) => (
            <View key={`${entry.date}-${i}`} style={styles.entryItem}>
              <Icon
                name={getMoodIcon(entry.mood) as any}
                size={24}
                color={getMoodColor(entry.mood)}
                style={styles.entryIcon}
              />
              <View style={styles.entryMiddle}>
                <Text style={styles.entryNote}>{entry.note || 'No note'}</Text>
                <Text style={styles.entryDate}>{entry.date}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  healthCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1e293b', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, marginHorizontal: 20, marginTop: 12 },
  healthText: { flex: 1, color: '#e2e8f0', fontSize: 13, fontWeight: '600' },
  container: {
    flexGrow: 1,
    backgroundColor: '#0f172a',
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#134e4a',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    minHeight: 300,
    overflow: 'hidden',
    padding: 22,
  },
  heroOrbOne: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#0f766e', right: -70, top: -90, opacity: 0.9 },
  heroOrbTwo: { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: '#115e59', left: -100, bottom: -105 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.13)', borderRadius: 18, paddingHorizontal: 10, paddingVertical: 7 },
  brandText: { color: '#d1fae5', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  coachCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#134e4a', borderWidth: 1, borderColor: '#0f766e', borderRadius: 18, padding: 16, marginHorizontal: 20, marginTop: 22 },
  coachIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0f766e', alignItems: 'center', justifyContent: 'center' },
  coachBody: { flex: 1 }, coachTitle: { color: '#f0fdfa', fontSize: 16, fontWeight: '800' }, coachText: { color: '#99f6e4', fontSize: 12, marginTop: 3 },
  helpPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fda4af', borderRadius: 18, paddingHorizontal: 11, paddingVertical: 7 }, helpPillText: { color: '#4c0519', fontSize: 12, fontWeight: '800' },
  heroStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 }, statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#6ee7b7' }, heroStatusText: { color: '#ccfbf1', fontSize: 11 },
  heroGreeting: { color: '#99f6e4', fontSize: 14, fontWeight: '600', marginTop: 31 },
  heroTitle: { color: '#f0fdfa', fontSize: 31, fontWeight: '800', lineHeight: 37, marginTop: 6 },
  heroSubtitle: {
    color: '#ccfbf1',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 11,
    maxWidth: 325,
  },
  heroMetrics: { flexDirection: 'row', alignItems: 'center', marginTop: 22, backgroundColor: 'rgba(6,78,59,0.55)', borderWidth: 1, borderColor: 'rgba(153,246,228,0.22)', borderRadius: 15, paddingLeft: 14, paddingVertical: 11 },
  heroMetricValue: { color: '#f0fdfa', fontSize: 17, fontWeight: '800' }, heroMetricLabel: { color: '#99f6e4', fontSize: 10, marginTop: 2 }, heroMetricDivider: { width: 1, height: 30, backgroundColor: 'rgba(153,246,228,0.28)', marginHorizontal: 18 }, heroAction: { width: 39, height: 39, borderRadius: 20, marginLeft: 'auto', marginRight: 9, backgroundColor: '#99f6e4', alignItems: 'center', justifyContent: 'center' },
  
  section: {
    marginHorizontal: 20,
    marginBottom: 28,
  },
  checkInTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  checkInSubtitle: { color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 6, marginBottom: 17 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  viewAll: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '500',
  },
  moodGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  moodButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    height: 90,
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#1e293b',
    color: '#f1f5f9',
    fontSize: 14,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignSelf: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  toolsSection: {
    marginHorizontal: 20,
    marginBottom: 26,
  },
  toolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
  },
  toolCard: {
    width: '48%',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
  },
  toolTitle: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
  },
  toolText: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 20,
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: '#1e293b',
    borderRadius: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#10b981',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 20,
  },
  entryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#1e293b',
    borderRadius: 14,
    marginBottom: 10,
  },
  entryIcon: {
    marginRight: 14,
  },
  entryMiddle: {
    flex: 1,
  },
  entryNote: {
    color: '#cbd5e1',
    fontSize: 14,
    marginBottom: 2,
  },
  entryDate: {
    color: '#64748b',
    fontSize: 11,
  },
});
