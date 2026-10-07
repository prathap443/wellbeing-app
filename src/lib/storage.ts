import AsyncStorage from '@react-native-async-storage/async-storage';

// Every key the app writes. Keep this in sync when adding new storage so
// export and "clear all data" cover everything.
export const DATA_KEYS = [
  'mood_entries',
  'daily_check_ins',
  'journal_entries',
  'habit_records',
  'weekly_habit_goal',
  'mental_state_plans',
  'meditation_completed',
  'meditation_favourites',
  'sleep_reset_habits',
  'therapy_companion_plan',
  'trusted_contacts',
  'coach_profile',
  'coach_consent',
  'coach_session',
  'account_prompt_seen',
  'activity_log',
] as const;

export const SETTINGS_KEY = 'app_settings';
export const ONBOARDING_KEY = 'onboarding_complete';

export type AppSettings = {
  reminderEnabled: boolean;
  reminderHour: number;
  appLock: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  reminderEnabled: false,
  reminderHour: 20,
  appLock: false,
};

export async function loadSettings(): Promise<AppSettings> {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...(stored ? JSON.parse(stored) : {}) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const next = { ...(await loadSettings()), ...patch };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export async function exportAllData(): Promise<string> {
  const pairs = await AsyncStorage.multiGet([...DATA_KEYS, SETTINGS_KEY]);
  const data: Record<string, unknown> = {};
  for (const [key, value] of pairs) {
    if (value == null) continue;
    try {
      data[key] = JSON.parse(value);
    } catch {
      data[key] = value;
    }
  }
  return JSON.stringify({ app: 'Wellbeing', exportedAt: new Date().toISOString(), data }, null, 2);
}

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([...DATA_KEYS, SETTINGS_KEY]);
}
