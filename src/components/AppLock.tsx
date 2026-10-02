import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons as Icon } from '@expo/vector-icons';
import { loadSettings } from '../lib/storage';

// Re-lock only after the app has been in the background for a while, so
// briefly opening the share sheet or phone app does not prompt again.
const RELOCK_AFTER_MS = 60_000;

export default function AppLock({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState<boolean | null>(null);
  const backgroundedAt = useRef<number | null>(null);
  const authenticating = useRef(false);

  const unlock = useCallback(async () => {
    if (authenticating.current) return;
    authenticating.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock Wellbeing' });
      if (result.success) setLocked(false);
    } finally {
      authenticating.current = false;
    }
  }, []);

  useEffect(() => {
    loadSettings().then((settings) => {
      setLocked(settings.appLock);
      if (settings.appLock) unlock();
    });
  }, [unlock]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (state) => {
      if (state === 'background') {
        backgroundedAt.current = Date.now();
      } else if (state === 'active' && backgroundedAt.current) {
        const away = Date.now() - backgroundedAt.current;
        backgroundedAt.current = null;
        if (away > RELOCK_AFTER_MS && (await loadSettings()).appLock) {
          setLocked(true);
          unlock();
        }
      }
    });
    return () => subscription.remove();
  }, [unlock]);

  if (locked === null) return <View style={styles.container} />;
  // Overlay rather than unmount, so unsaved text survives a re-lock.
  return <View style={styles.fill}>
    {children}
    {locked ? <View style={[StyleSheet.absoluteFill, styles.container]}>
      <Icon name="lock-closed-outline" size={44} color="#34d399" />
      <Text style={styles.title}>Wellbeing is locked</Text>
      <TouchableOpacity style={styles.button} onPress={unlock} accessibilityRole="button"><Text style={styles.buttonText}>Unlock</Text></TouchableOpacity>
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  container: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#f8fafc', fontSize: 20, fontWeight: '700', marginTop: 16 },
  button: { backgroundColor: '#10b981', borderRadius: 24, paddingVertical: 13, paddingHorizontal: 32, marginTop: 24 }, buttonText: { color: '#022c22', fontWeight: '800', fontSize: 16 },
});
