import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './src/navigation/AppNavigator';
import AppLock from './src/components/AppLock';
import ErrorBoundary from './src/components/ErrorBoundary';
import Onboarding from './src/components/Onboarding';
import { ONBOARDING_KEY } from './src/lib/storage';
import { recoverInterruptedRestore } from './src/lib/backup';
import { SessionProvider, useSession } from './src/lib/session';
import { accountsAvailable } from './src/lib/account';
import AccountScreen from './src/screens/AccountScreen';

const ACCOUNT_PROMPT_KEY = 'account_prompt_seen';
import './src/lib/reminders';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <ErrorBoundary>
        <SessionProvider>
          <Root />
        </SessionProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

function Root() {
  const session = useSession();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [accountPrompted, setAccountPrompted] = useState<boolean | null>(null);
  // An interrupted backup restore must be undone before screens read data. If that fails, say so.
  const [recovery, setRecovery] = useState<'checking' | 'done' | 'failed'>('checking');
  const runRecovery = () => {
    setRecovery('checking');
    recoverInterruptedRestore().then((r) => setRecovery(r === 'failed' ? 'failed' : 'done'), () => setRecovery('failed'));
  };
  useEffect(runRecovery, []);

  useEffect(() => {
    // Finish undoing an interrupted backup restore before any screen reads its data.
    AsyncStorage.multiGet([ONBOARDING_KEY, ACCOUNT_PROMPT_KEY])
      .then(([[, done], [, prompted]]) => { setOnboarded(done === 'true'); setAccountPrompted(prompted === 'true'); })
      .catch(() => { setOnboarded(false); setAccountPrompted(false); });
  }, []);

  const finishOnboarding = () => {
    AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setOnboarded(true);
  };

  const finishAccountPrompt = () => {
    AsyncStorage.setItem(ACCOUNT_PROMPT_KEY, 'true');
    setAccountPrompted(true);
  };

  if (recovery === 'failed') {
    return <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', padding: 28 }}>
      <Text style={{ color: '#f8fafc', fontSize: 20, fontWeight: '800' }}>Finishing an earlier restore</Text>
      <Text style={{ color: '#94a3b8', lineHeight: 21, marginTop: 10 }}>A backup restore was interrupted. Your previous data is saved safely and is being put back, but that hasn't worked yet.</Text>
      <TouchableOpacity onPress={runRecovery} accessibilityRole="button" style={{ backgroundColor: '#10b981', borderRadius: 24, paddingVertical: 14, alignItems: 'center', marginTop: 22 }}><Text style={{ color: '#022c22', fontWeight: '800' }}>Try again</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => setRecovery('done')} accessibilityRole="button" style={{ paddingVertical: 14, alignItems: 'center', marginTop: 6 }}><Text style={{ color: '#cbd5e1', fontWeight: '700' }}>Continue for now</Text></TouchableOpacity>
      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18, marginTop: 8 }}>If you continue, the saved copy is kept and Wellbeing tries again next time it opens. Restoring another backup stays unavailable until this is finished.</Text>
    </SafeAreaView>;
  }
  if (recovery === 'checking' || onboarded === null || accountPrompted === null || !session.ready) return <View style={{ flex: 1, backgroundColor: '#0f172a' }} />;
  if (!onboarded) return <Onboarding onDone={finishOnboarding} />;
  // One-time, skippable sign-up offer right after onboarding.
  if (!accountPrompted && !session.user && accountsAvailable()) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}><AccountScreen onDone={finishAccountPrompt} /></SafeAreaView>;
  }
  return (
    <AppLock>
      <AppNavigator />
    </AppLock>
  );
}
