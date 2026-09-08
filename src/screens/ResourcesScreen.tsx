import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React from 'react';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const RESOURCES = [
  { icon: 'water-outline', title: 'Grounding exercise', text: 'Use your senses to return to the present moment.', screen: 'Grounding' },
  { icon: 'chatbubble-ellipses-outline', title: 'Reach out', text: 'Message or call someone you trust today.', screen: 'ReachOut' },
  { icon: 'moon-outline', title: 'Sleep reset', text: 'Build a simple wind-down routine before bed.', screen: 'SleepReset' },
];

type ResourceParams = {
  Grounding: undefined;
  ReachOut: undefined;
  SleepReset: undefined;
  SupportGuidance: undefined;
};

type ResourceNavigation = NativeStackNavigationProp<ResourceParams>;

export default function ResourcesScreen() {
  const navigation = useNavigation<ResourceNavigation>();
  return <ScrollView contentContainerStyle={styles.container}>
    <View style={styles.header}><Icon name="compass-outline" size={28} color="#60a5fa" /><Text style={styles.title}>Tools and support</Text><Text style={styles.subtitle}>Practical support for difficult moments.</Text></View>
    {RESOURCES.map((resource) => <TouchableOpacity key={resource.title} style={styles.card} onPress={() => navigation.navigate(resource.screen as keyof ResourceParams)}><Icon name={resource.icon as any} size={24} color="#60a5fa" /><View style={styles.cardContent}><Text style={styles.cardTitle}>{resource.title}</Text><Text style={styles.cardText}>{resource.text}</Text></View><Icon name="chevron-forward-outline" size={20} color="#64748b" /></TouchableOpacity>)}
    <View style={styles.safetyCard}><Icon name="heart-outline" size={26} color="#fda4af" /><Text style={styles.safetyTitle}>Need immediate help?</Text><Text style={styles.safetyText}>If you may harm yourself or someone else, contact local emergency services or a crisis service now. This app is not a replacement for professional care.</Text><TouchableOpacity onPress={() => navigation.navigate('SupportGuidance')}><Text style={styles.safetyButton}>View support guidance</Text></TouchableOpacity></View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 20, paddingBottom: 40 }, header: { marginBottom: 24 }, title: { color: '#f8fafc', fontSize: 26, fontWeight: '700', marginTop: 12 }, subtitle: { color: '#94a3b8', marginTop: 6 }, card: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 16, padding: 18, marginBottom: 12, gap: 14 }, cardContent: { flex: 1 }, cardTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700' }, cardText: { color: '#94a3b8', lineHeight: 20, marginTop: 5 }, safetyCard: { backgroundColor: '#4c1d2b', borderRadius: 16, padding: 20, marginTop: 16 }, safetyTitle: { color: '#ffe4e6', fontSize: 18, fontWeight: '700', marginTop: 12 }, safetyText: { color: '#fecdd3', lineHeight: 21, marginTop: 8 }, safetyButton: { color: '#fff', fontWeight: '700', marginTop: 18 },
});
