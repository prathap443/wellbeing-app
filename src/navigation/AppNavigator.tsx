import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
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
import SubscriptionScreen from '../screens/SubscriptionScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const HomeStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="CheckIn" component={CheckInScreen} />
    <Stack.Screen name="Journal" component={JournalScreen} />
    <Stack.Screen name="Breathe" component={BreatheScreen} />
    <Stack.Screen name="Resources" component={ResourcesScreen} />
    <Stack.Screen name="Grounding" component={GroundingScreen} />
    <Stack.Screen name="ReachOut" component={ReachOutScreen} />
    <Stack.Screen name="SleepReset" component={SleepResetScreen} />
    <Stack.Screen name="SupportGuidance" component={SupportGuidanceScreen} />
    <Stack.Screen name="Goals" component={GoalsScreen} />
    <Stack.Screen name="Planner" component={PlannerScreen} />
    <Stack.Screen name="Meditation" component={MeditationScreen} />
    <Stack.Screen name="TherapyCompanion" component={TherapyCompanionScreen} />
    <Stack.Screen name="Subscription" component={SubscriptionScreen} />
  </Stack.Navigator>
);

const HistoryStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="History" component={HistoryScreen} />
  </Stack.Navigator>
);

const InsightsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="Insights" component={InsightsScreen} />
  </Stack.Navigator>
);

const SettingsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="Settings" component={SettingsScreen} />
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
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopWidth: 1,
          borderTopColor: '#334155',
          height: 70,
          paddingBottom: 10,
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
    <NavigationContainer>
      <TabNavigator />
    </NavigationContainer>
  );
}
