import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseEntryDate } from '../lib/dates';
import { useNavigation } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MoodEntry {
  mood: string;
  note: string;
  date: string;
  timestamp?: string;
}

const MOOD_OPTIONS = [
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

const MOOD_COLORS: Record<string, string> = {
  'great': '#10b981',
  'good': '#f59e0b',
  'okay': '#6b7280',
  'bad': '#f87171',
  'very_bad': '#3b82f6',
};

const getMoodIcon = (moodId: string) => MOOD_ICONS[moodId] || 'happy-outline';
const getMoodColor = (moodId: string) => MOOD_COLORS[moodId] || '#64748b';

export default function HistoryScreen() {
  const navigation = useNavigation();
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'week' | 'month'>('all');

  useEffect(() => {
    // Tabs stay mounted, so reload on focus to pick up entries logged elsewhere.
    return navigation.addListener('focus', loadEntries);
  }, [navigation]);

  const loadEntries = async () => {
    try {
      const stored = await AsyncStorage.getItem('mood_entries');
      setEntries(stored ? JSON.parse(stored) : []);
    } catch (e) {
      console.error('Failed to load entries', e);
    }
  };

  const filteredEntries = entries.filter(e => {
    const entryDate = parseEntryDate(e);
    const now = new Date();
    if (filter === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return entryDate >= weekAgo;
    }
    if (filter === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return entryDate >= monthAgo;
    }
    return true;
  });

  const filterOptions = ['all', 'week', 'month'] as const;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History</Text>
        <Text style={styles.headerSubtitle}>{entries.length} total entries</Text>
      </View>
      
      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {filterOptions.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.filterTab,
              { backgroundColor: filter === f ? '#10b981' : 'transparent' }
            ]}
          >
            <Text style={[
              styles.filterTabText,
              { color: filter === f ? '#fff' : '#64748b' }
            ]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="calendar-outline" size={48} color="#64748b" />
          <Text style={styles.emptyTitle}>No entries yet</Text>
          <Text style={styles.emptyText}>
            {filter === 'all' ? 'Start logging your moods' : `No entries in this ${filter}`}
          </Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {filteredEntries.map((entry, i) => (
            <View key={`${entry.date}-${i}`} style={styles.entryItem}>
              <View style={[
                styles.moodIndicator,
                { backgroundColor: getMoodColor(entry.mood) }
              ]} />
              <View style={styles.entryContent}>
                <View style={styles.entryHeader}>
                  <Icon
                    name={getMoodIcon(entry.mood) as any}
                    size={24}
                    color={getMoodColor(entry.mood)}
                  />
                  <Text style={styles.entryDate}>{entry.date}</Text>
                </View>
                <Text style={styles.entryNote}>
                  {entry.note || 'No note added'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0f172a',
    paddingBottom: 40,
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  filterTabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterTab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
  },
  entryItem: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
  },
  moodIndicator: {
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  entryContent: {
    flex: 1,
    padding: 16,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  entryDate: {
    color: '#64748b',
    fontSize: 11,
  },
  entryNote: {
    color: '#94a3b8',
    fontSize: 13,
  },
});