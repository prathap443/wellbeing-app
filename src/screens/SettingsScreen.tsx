import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Dimensions,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons as Icon } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [autoBackup, setAutoBackup] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('app_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setNotifications(parsed.notifications ?? true);
        setDarkMode(parsed.darkMode ?? true);
        setAutoBackup(parsed.autoBackup ?? false);
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  };

  const saveSetting = async (key: string, value: boolean) => {
    try {
      const settings = await AsyncStorage.getItem('app_settings');
      const current = settings ? JSON.parse(settings) : {};
      await AsyncStorage.setItem('app_settings', JSON.stringify({
        ...current,
        [key]: value,
      }));
    } catch (e) {
      console.error('Failed to save setting', e);
    }
  };

  const exportData = async () => {
    try {
      const entries = await AsyncStorage.getItem('mood_entries');
      const settings = await AsyncStorage.getItem('app_settings');
      const exportObj = {
        entries: entries ? JSON.parse(entries) : [],
        settings: settings ? JSON.parse(settings) : {},
        exportedAt: new Date().toISOString(),
      };
      const json = JSON.stringify(exportObj, null, 2);
      Alert.alert('Data Export', 'Your data is ready. In a real app this would save to files or share.', [
        { text: 'OK' },
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your mood entries and settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove(['mood_entries', 'app_settings']);
            Alert.alert('Done', 'All data has been cleared');
          },
        },
      ]
    );
  };

  const settingRow = (
    label: string,
    subtitle: string,
    value: boolean,
    onChange: (v: boolean) => void,
    icon: string
  ) => (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <Icon name={icon as any} size={22} color="#64748b" />
        <View style={styles.settingText}>
          <Text style={styles.settingLabel}>{label}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        thumbColor={value ? '#10b981' : '#fff'}
        trackColor={{ true: '#10b981', false: '#334155' }}
      />
    </View>
  );

  const actionButton = (
    label: string,
    subtitle: string,
    icon: string,
    onPress: () => void,
    destructive = false
  ) => (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <View style={styles.actionLeft}>
        <Icon name={icon as any} size={22} color={destructive ? '#f87171' : '#64748b'} />
        <View style={styles.settingText}>
          <Text style={[styles.settingLabel, destructive && { color: '#f87171' }]}>{label}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Icon name="chevron-forward-outline" size={18} color="#64748b" />
    </TouchableOpacity>
  );

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Customize your experience</Text>
      </View>
      
      {/* Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        {settingRow(
          'Notifications',
          'Daily reminders to log your mood',
          notifications,
          (v) => { setNotifications(v); saveSetting('notifications', v); },
          'notifications-outline'
        )}
        {settingRow(
          'Dark Mode',
          'Use dark theme (light mode coming soon)',
          darkMode,
          (v) => { setDarkMode(v); saveSetting('darkMode', v); },
          'moon-outline'
        )}
        {settingRow(
          'Auto Backup',
          'Sync data to cloud automatically',
          autoBackup,
          (v) => { setAutoBackup(v); saveSetting('autoBackup', v); },
          'cloud-upload-outline'
        )}
      </View>
      
      {/* Data Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        {actionButton(
          'Export Data',
          'Download all your mood entries',
          'download-outline',
          exportData
        )}
        {actionButton(
          'Clear All Data',
          'Permanently delete everything',
          'trash-outline',
          clearAllData,
          true
        )}
      </View>
      
      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>Version</Text>
          <Text style={styles.aboutValue}>1.0.0</Text>
        </View>
        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>Built with</Text>
          <Text style={styles.aboutValue}>React Native + Expo + TypeScript</Text>
        </View>
        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>Privacy</Text>
          <Text style={styles.aboutValue}>All data stored locally on device</Text>
        </View>
      </View>
      
      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Wellbeing Tracker</Text>
        <Text style={styles.footerSub}>Take care of your mind</Text>
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
  section: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 12,
    color: '#64748b',
    margin: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    // icon styling handled inline
  },
  settingText: {},
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#f1f5f9',
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  aboutLabel: {
    fontSize: 15,
    color: '#f1f5f9',
  },
  aboutValue: {
    fontSize: 13,
    color: '#64748b',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  footerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
});