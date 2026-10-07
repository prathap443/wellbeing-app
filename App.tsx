import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
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

  useEffect(() => {
    // Finish undoing an interrupted backup restore before any screen reads its data.
    recoverInterruptedRestore().catch(() => false).then(() => AsyncStorage.multiGet([ONBOARDING_KEY, ACCOUNT_PROMPT_KEY]))
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

  if (onboarded === null || accountPrompted === null || !session.ready) return <View style={{ flex: 1, backgroundColor: '#0f172a' }} />;
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
