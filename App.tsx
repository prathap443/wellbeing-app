import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './src/navigation/AppNavigator';
import AppLock from './src/components/AppLock';
import Onboarding from './src/components/Onboarding';
import { ONBOARDING_KEY } from './src/lib/storage';
import './src/lib/reminders';

export default function App() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => setOnboarded(value === 'true')).catch(() => setOnboarded(false));
  }, []);

  const finishOnboarding = () => {
    AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setOnboarded(true);
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {onboarded === null ? (
        <View style={{ flex: 1, backgroundColor: '#0f172a' }} />
      ) : onboarded ? (
        <AppLock>
          <AppNavigator />
        </AppLock>
      ) : (
        <Onboarding onDone={finishOnboarding} />
      )}
    </SafeAreaProvider>
  );
}
