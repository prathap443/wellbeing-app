import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Linking,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons as Icon } from '@expo/vector-icons';
import { AppSettings, DEFAULT_SETTINGS, clearAllData, loadSettings, saveSettings } from '../lib/storage';
import { BackupError, applyBackup, exportBackup, parseBackup, pickBackupFile, type ParsedBackup } from '../lib/backup';
import { disableDailyReminder, enableDailyReminder, formatHour } from '../lib/reminders';
import { useSession } from '../lib/session';
import { accountsAvailable } from '../lib/account';
import { useHealth } from '../lib/useHealth';

const REMINDER_HOURS = [8, 12, 18, 20, 22];

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const health = useHealth(navigation);
  const { user, plus } = useSession();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const update = async (patch: Partial<AppSettings>) => {
    setSettings(await saveSettings(patch));
  };

  const toggleReminder = async (enabled: boolean) => {
    if (!enabled) {
      await disableDailyReminder();
      await update({ reminderEnabled: false });
      return;
    }
    const granted = await enableDailyReminder(settings.reminderHour);
    if (!granted) {
      Alert.alert('Notifications are off', 'Allow notifications for Wellbeing in your device Settings to get a daily reminder.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    await update({ reminderEnabled: true });
  };

  const changeReminderHour = async (hour: number) => {
    await update({ reminderHour: hour });
    if (settings.reminderEnabled) await enableDailyReminder(hour);
  };

  const toggleAppLock = async (enabled: boolean) => {
    if (enabled) {
      const [hasHardware, enrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
      if (!hasHardware || !enrolled) {
        Alert.alert('Not available', 'Set up Face ID, Touch ID or a device passcode in your device Settings first.');
        return;
      }
    }
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: enabled ? 'Turn on app lock' : 'Turn off app lock' });
    if (result.success) await update({ appLock: enabled });
  };

  const exportData = async () => {
    try {
      await exportBackup();
    } catch (e) {
      Alert.alert('Backup failed', e instanceof BackupError ? e.message : 'The backup file could not be created. Please try again.');
    }
  };

  const restoreData = async () => {
    let backup: ParsedBackup;
    try {
      const text = await pickBackupFile();
      if (text == null) return; // cancelled
      backup = parseBackup(text);
    } catch (e) {
      Alert.alert('Cannot restore', e instanceof BackupError ? e.message : 'That file could not be read.');
      return;
    }
    const when = backup.exportedAt ? `Backup from ${new Date(backup.exportedAt).toLocaleString()}` : 'Wellbeing backup';
    const skippedNote = backup.skipped ? `\n\n${backup.skipped} damaged or unrecognised item${backup.skipped === 1 ? '' : 's'} will be skipped.` : '';
    const preview = `${when}\n\n${backup.summary.map((s) => `${s.label}: ${s.count}`).join('\n') || 'Settings and plans only'}${skippedNote}\n\nMerge keeps everything on this phone and adds what is missing. Replace swaps this phone's data for the backup.`;
    const run = async (mode: 'merge' | 'replace') => {
      let result: Awaited<ReturnType<typeof applyBackup>>;
      try { result = await applyBackup(backup, mode); } catch { result = { ok: false, rolledBack: false }; }
      if (!result.ok && result.pendingRecovery) { Alert.alert('Restore not started', 'An earlier restore still needs to be finished first. Fully close and reopen Wellbeing, then try again. Nothing was changed.'); return; }
      if (result.ok) Alert.alert('Restored', 'Your backup has been restored. Fully close and reopen the app to refresh every screen.');
      else if (result.rolledBack) Alert.alert('Restore failed', 'Your data on this phone was kept as it was. Please try again.');
      else Alert.alert('Restore failed', 'A copy of your previous data was saved before the restore started. Fully close and reopen the app, and it will be put back automatically.');
    };
    Alert.alert('Restore this backup?', preview, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Replace', style: 'destructive', onPress: () => Alert.alert('Replace everything?', 'Mood entries, check-ins, journal and other data on this phone will be replaced by the backup. This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', style: 'destructive', onPress: () => run('replace') },
      ]) },
      { text: 'Merge', onPress: () => run('merge') },
    ]);
  };

  const confirmClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete your mood entries, journal, check-ins, plans, contacts and settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            await disableDailyReminder();
            await clearAllData();
            setSettings(DEFAULT_SETTINGS);
            Alert.alert('Done', 'All data has been cleared. Fully close and reopen the app to refresh every screen.');
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

      {/* Account and subscription */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        {accountsAvailable() ? actionButton(
          user ? (user.name || 'Your account') : 'Create account or sign in',
          user ? user.email : 'Optional: keep Plus on all your devices',
          'person-circle-outline',
          () => navigation.navigate('Account')
        ) : null}
        {actionButton(
          plus ? 'Wellbeing Plus: active' : 'Wellbeing Plus',
          plus ? 'Manage your subscription' : '30 AI coach questions a day',
          'sparkles-outline',
          () => navigation.navigate('Subscription')
        )}
      </View>

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reminders and privacy</Text>
        {settingRow(
          'Daily reminder',
          settings.reminderEnabled ? `Every day at ${formatHour(settings.reminderHour)}` : 'A gentle nudge to check in',
          settings.reminderEnabled,
          toggleReminder,
          'notifications-outline'
        )}
        {settings.reminderEnabled ? (
          <View style={styles.hourRow}>
            {REMINDER_HOURS.map((hour) => (
              <TouchableOpacity
                key={hour}
                style={[styles.hourChip, settings.reminderHour === hour && styles.hourChipActive]}
                onPress={() => changeReminderHour(hour)}
                accessibilityRole="button"
                accessibilityState={{ selected: settings.reminderHour === hour }}
              >
                <Text style={[styles.hourText, settings.reminderHour === hour && styles.hourTextActive]}>{formatHour(hour)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        {settingRow(
          'App lock',
          'Require Face ID or passcode to open',
          settings.appLock,
          toggleAppLock,
          'lock-closed-outline'
        )}
        {health.available ? settingRow(
          'Apple Health',
          health.connected ? 'Showing sleep and steps in History. Stays on this phone.' : 'Show your sleep and steps in History',
          health.connected,
          (on) => {
            if (on) { health.connect(); return; }
            health.disconnect();
            Alert.alert('Apple Health disconnected', 'Wellbeing has stopped reading your Health data. To remove its access completely, go to Settings → Privacy & Security → Health → Wellbeing.');
          },
          'heart-outline'
        ) : null}
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        {actionButton(
          'Get help now',
          'Crisis lines and urgent support',
          'heart-outline',
          () => navigation.navigate('Home', { screen: 'SupportGuidance' })
        )}
      </View>

      {/* Data Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        {actionButton(
          'Back up data',
          'Save a backup file you can restore later. It contains your private notes, so keep it somewhere safe.',
          'download-outline',
          exportData
        )}
        {actionButton(
          'Restore from backup',
          'Merge or replace data from a backup file',
          'cloud-upload-outline',
          restoreData
        )}
        {actionButton(
          'Clear All Data',
          'Permanently delete everything',
          'trash-outline',
          confirmClearAllData,
          true
        )}
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        {actionButton(
          'Privacy Policy',
          'How your data is handled',
          'shield-checkmark-outline',
          () => navigation.navigate('Privacy')
        )}
        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>Version</Text>
          <Text style={styles.aboutValue}>{Constants.expoConfig?.version ?? '1.0.0'}</Text>
        </View>
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            Wellbeing supports reflection and self-care. It is not a medical device and cannot diagnose, treat, or replace care from a qualified professional.
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Wellbeing</Text>
        <Text style={styles.footerSub}>Take care of your mind</Text>
      </View>
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
    flex: 1,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    // icon styling handled inline
  },
  settingText: {
    flexShrink: 1,
  },
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
  hourRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingLeft: 50,
  },
  hourChip: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  hourChipActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  hourText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  hourTextActive: {
    color: '#022c22',
  },
  disclaimer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 18,
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