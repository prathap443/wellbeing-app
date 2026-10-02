import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import InsightsScreen from '../screens/InsightsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CheckInScreen from '../screens/CheckInScreen';
import JournalScreen from '../screens/JournalScreen';
import BreatheScreen from '../screens/BreatheScreen';
import ResourcesScreen from '../screens/ResourcesScreen';
import GroundingScreen from '../screens/GroundingScreen';
import ReachOutScreen from '../screens/ReachOutScreen';
import SleepResetScreen from '../screens/SleepResetScreen';
import SupportGuidanceScreen from '../screens/SupportGuidanceScreen';
import GoalsScreen from '../screens/GoalsScreen';
import PlannerScreen from '../screens/PlannerScreen';
import MeditationScreen from '../screens/MeditationScreen';
import TherapyCompanionScreen from '../screens/TherapyCompanionScreen';
import AnxietySupportScreen from '../screens/AnxietySupportScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import CoachScreen from '../screens/CoachScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import AccountScreen from '../screens/AccountScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const BACKGROUND = '#0f172a';

// Sub-screens get a native header with a back button; tab roots have no
// header, so pad them below the status bar / Dynamic Island instead.
const stackOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: BACKGROUND },
  headerTintColor: '#f8fafc',
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal' as const,
  contentStyle: { backgroundColor: BACKGROUND },
};

const rootOptions = {
  headerShown: false,
  layout: ({ children }: { children: React.ReactNode }) => (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: BACKGROUND }}>{children}</SafeAreaView>
  ),
};

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: BACKGROUND, card: '#1e293b', primary: '#10b981' },
};

const HomeStack = () => (
  <Stack.Navigator
    screenOptions={stackOptions}
  >
    <Stack.Screen name="Home" component={HomeScreen} options={rootOptions} />
    <Stack.Screen name="CheckIn" component={CheckInScreen} options={{ title: 'Check-in' }} />
    <Stack.Screen name="Journal" component={JournalScreen} options={{ title: 'Journal' }} />
    <Stack.Screen name="Breathe" component={BreatheScreen} options={{ title: 'Breathe' }} />
    <Stack.Screen name="Resources" component={ResourcesScreen} options={{ title: 'Tools and support' }} />
    <Stack.Screen name="Grounding" component={GroundingScreen} options={{ title: 'Grounding' }} />
    <Stack.Screen name="ReachOut" component={ReachOutScreen} options={{ title: 'Reach out' }} />
    <Stack.Screen name="SleepReset" component={SleepResetScreen} options={{ title: 'Sleep reset' }} />
    <Stack.Screen name="SupportGuidance" component={SupportGuidanceScreen} options={{ title: 'Get help now' }} />
    <Stack.Screen name="Goals" component={GoalsScreen} options={{ title: 'Habits and goals' }} />
    <Stack.Screen name="Planner" component={PlannerScreen} options={{ title: 'Planner' }} />
    <Stack.Screen name="Meditation" component={MeditationScreen} options={{ title: 'Meditation' }} />
    <Stack.Screen name="TherapyCompanion" component={TherapyCompanionScreen} options={{ title: 'Therapy companion' }} />
    <Stack.Screen name="AnxietySupport" component={AnxietySupportScreen} options={{ title: 'Anxiety support' }} />
    <Stack.Screen name="Coach" component={CoachScreen} options={{ title: 'AI coach' }} />
    <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ title: 'Wellbeing Plus' }} />
    <Stack.Screen name="Account" options={{ title: 'Account' }}>{() => <AccountScreen />}</Stack.Screen>
    <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ title: 'Privacy Policy' }} />
  </Stack.Navigator>
);

const HistoryStack = () => (
  <Stack.Navigator
    screenOptions={stackOptions}
  >
    <Stack.Screen name="History" component={HistoryScreen} options={rootOptions} />
  </Stack.Navigator>
);

const InsightsStack = () => (
  <Stack.Navigator
    screenOptions={stackOptions}
  >
    <Stack.Screen name="Insights" component={InsightsScreen} options={rootOptions} />
  </Stack.Navigator>
);

const SettingsStack = () => (
  <Stack.Navigator
    screenOptions={stackOptions}
  >
    <Stack.Screen name="Settings" component={SettingsScreen} options={rootOptions} />
    <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ title: 'Privacy Policy' }} />
    <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ title: 'Wellbeing Plus' }} />
    <Stack.Screen name="Account" options={{ title: 'Account' }}>{() => <AccountScreen />}</Stack.Screen>
  </Stack.Navigator>
);

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => {
      const icons: Record<string, string> = {
        Home: 'home-outline',
        History: 'calendar-outline',
        Insights: 'analytics-outline',
        Settings: 'settings-outline',
      };
      return {
        headerShown: false,
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopWidth: 1,
          borderTopColor: '#334155',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarIcon: ({ focused, color, size }) => (
          <Icon
            name={(icons[route.name] || 'help-outline') as any}
            focused={focused}
            color={color}
            size={size}
          />
        ),
      };
    }}
  >
    <Tab.Screen
      name="Home"
      component={HomeStack}
      options={{
        tabBarLabel: 'Home',
      }}
    />
    <Tab.Screen
      name="History"
      component={HistoryStack}
      options={{
        tabBarLabel: 'History',
      }}
    />
    <Tab.Screen
      name="Insights"
      component={InsightsStack}
      options={{
        tabBarLabel: 'Insights',
      }}
    />
    <Tab.Screen
      name="Settings"
      component={SettingsStack}
      options={{
        tabBarLabel: 'Settings',
      }}
    />
  </Tab.Navigator>
);

export default function AppNavigator() {
  return (
    <NavigationContainer theme={theme}>
      <TabNavigator />
    </NavigationContainer>
  );
}
