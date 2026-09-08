import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons as Icon } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MoodEntry {
  mood: string;
  note: string;
  date: string;
}

const MOOD_OPTIONS = [
  { id: 'great', icon: 'happy-outline', label: 'Great', color: '#10b981' },
  { id: 'good', icon: 'happy-outline', label: 'Good', color: '#f59e0b' },
  { id: 'okay', icon: 'remove-outline', label: 'Okay', color: '#6b7280' },
  { id: 'bad', icon: 'sad-outline', label: 'Bad', color: '#f87171' },
  { id: 'very_bad', icon: 'sad-outline', label: 'Very Bad', color: '#3b82f6' },
];

const MOOD_COLORS: Record<string, string> = {
  'great': '#10b981',
  'good': '#f59e0b',
  'okay': '#6b7280',
  'bad': '#f87171',
  'very_bad': '#3b82f6',
};

const MOOD_VALUES: Record<string, number> = {
  'great': 5, 'good': 4, 'okay': 3, 'bad': 2, 'very_bad': 1,
};

const getMoodIcon = (moodId: string) => {
  const icons: Record<string, string> = {
    'great': 'happy-outline',
    'good': 'happy-outline',
    'okay': 'remove-outline',
    'bad': 'sad-outline',
    'very_bad': 'sad-outline',
  };
  return icons[moodId] || 'happy-outline';
};

const getMoodColor = (moodId: string) => MOOD_COLORS[moodId] || '#10b981';

export default function InsightsScreen() {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    avgMood: '—',
    currentStreak: 0,
    bestStreak: 0,
    moodCounts: {} as Record<string, number>,
    weeklyAvg: '0.0',
  });

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const stored = await AsyncStorage.getItem('mood_entries');
      if (stored) {
        const parsed = JSON.parse(stored);
        setEntries(parsed);
        calculateStats(parsed);
      }
    } catch (e) {
      console.error('Failed to load entries', e);
    }
  };

  const calculateStats = (data: MoodEntry[]) => {
    const moodCounts: Record<string, number> = {};
    let totalValue = 0;
    
    data.forEach(e => {
      moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
      totalValue += MOOD_VALUES[e.mood] || 3;
    });

    // Calculate streaks
    const dates = [...new Set(data.map(e => e.date))].sort().reverse();
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    
    const today = new Date().toLocaleDateString();
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
    
    if (dates[0] === today || dates[0] === yesterday) {
      currentStreak = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diff = Math.floor((prev.getTime() - curr.getTime()) / 86400000);
        if (diff === 1) currentStreak++;
        else break;
      }
    }
    
    // Best streak
    tempStreak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = Math.floor((prev.getTime() - curr.getTime()) / 86400000);
      if (diff === 1) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    // Weekly average
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekEntries = data.filter(e => new Date(e.date) >= weekAgo);
    const weekTotal = weekEntries.reduce((sum, e) => sum + (MOOD_VALUES[e.mood] || 3), 0);
    const weeklyAvg = weekEntries.length ? (weekTotal / weekEntries.length).toFixed(1) : '0.0';

    setStats({
      total: data.length,
      avgMood: data.length ? (totalValue / data.length).toFixed(1) : '—',
      currentStreak,
      bestStreak,
      moodCounts,
      weeklyAvg,
    });
  };

  const getTopMood = () => {
    let top = 'great';
    let max = 0;
    Object.entries(stats.moodCounts).forEach(([mood, count]) => {
      if (count > max) {
        max = count;
        top = mood;
      }
    });
    return top;
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Insights</Text>
        <Text style={styles.headerSubtitle}>Your wellbeing patterns</Text>
      </View>
      
      {/* Key Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Icon name="document-text-outline" size={24} color="#10b981" />
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Logs</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="bonfire-outline" size={24} color="#f59e0b" />
          <Text style={styles.statNumber}>{stats.currentStreak}</Text>
          <Text style={styles.statLabel}>Current Streak</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="trophy-outline" size={24} color="#f59e0b" />
          <Text style={styles.statNumber}>{stats.bestStreak}</Text>
          <Text style={styles.statLabel}>Best Streak</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="analytics-outline" size={24} color="#10b981" />
          <Text style={styles.statNumber}>{stats.avgMood}</Text>
          <Text style={styles.statLabel}>Avg Mood (1-5)</Text>
        </View>
      </View>
      
      {/* Top Mood */}
      <View style={styles.insightCard}>
        <Text style={styles.insightTitle}>Top Mood</Text>
        <View style={styles.topMood}>
          <Icon
            name={getMoodIcon(getTopMood()) as any}
            size={48}
            color={getMoodColor(getTopMood())}
          />
          <View style={styles.topMoodInfo}>
            <Text style={styles.topMoodLabel}>Most frequent</Text>
            <Text style={styles.topMoodCount}>
              {stats.moodCounts[getTopMood()] || 0} times
            </Text>
          </View>
        </View>
      </View>
      
      {/* Mood Distribution */}
      <View style={styles.insightCard}>
        <Text style={styles.insightTitle}>Mood Distribution</Text>
        <View style={styles.distributionContainer}>
          {MOOD_OPTIONS.map((m) => {
            const count = stats.moodCounts[m.id] || 0;
            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <View key={m.id} style={styles.distItem}>
                <View style={styles.distBar}>
                  <View style={[
                    styles.distFill,
                    { width: `${percentage}%`, backgroundColor: m.color }
                  ]} />
                </View>
                <View style={styles.distLabels}>
                  <Icon name={m.icon as any} size={16} color={m.color} />
                  <Text style={styles.distCount}>{count}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
      
      {/* Weekly Trend */}
      <View style={styles.insightCard}>
        <Text style={styles.insightTitle}>This Week</Text>
        <View style={styles.weekStats}>
          <View style={styles.weekStat}>
            <Text style={styles.weekStatValue}>{stats.weeklyAvg}</Text>
            <Text style={styles.weekStatLabel}>Avg Mood</Text>
          </View>
          <View style={styles.weekStat}>
            <Text style={styles.weekStatValue}>
              {entries.filter(e => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return new Date(e.date) >= weekAgo;
              }).length}
            </Text>
            <Text style={styles.weekStatLabel}>Entries</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10b981',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  insightCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 16,
  },
  topMood: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  topMoodInfo: {
    flex: 1,
  },
  topMoodLabel: {
    color: '#64748b',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  topMoodCount: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  distributionContainer: {
    gap: 12,
  },
  distItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  distBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
  },
  distFill: {
    height: '100%',
    borderRadius: 4,
  },
  distLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 70,
  },
  distCount: {
    color: '#94a3b8',
    fontSize: 12,
  },
  weekStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weekStat: {
    alignItems: 'center',
  },
  weekStatValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10b981',
  },
  weekStatLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
});