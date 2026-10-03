import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useState } from 'react';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { CRISIS_REGIONS, FIND_A_HELPLINE_URL, defaultRegionIndex, openCrisisLink } from '../lib/crisis';

export default function SupportGuidanceScreen() {
  const navigation = useNavigation<any>();
  const [regionIndex, setRegionIndex] = useState(defaultRegionIndex);
  const region = CRISIS_REGIONS[regionIndex];

  return <ScrollView contentContainerStyle={styles.container}>
    <Icon name="heart-outline" size={32} color="#fda4af" /><Text style={styles.title}>Get help now</Text><Text style={styles.subtitle}>You deserve support. Choose the next safest step for you.</Text>
    <View style={styles.urgent}><Text style={styles.urgentTitle}>If you are in immediate danger</Text><Text style={styles.urgentText}>Call your local emergency number now, or go to the nearest emergency department. If possible, stay with someone you trust.</Text></View>

    <Text style={styles.sectionTitle}>Crisis lines</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regions}>
      {CRISIS_REGIONS.map((item, index) => <TouchableOpacity key={item.region} onPress={() => setRegionIndex(index)} style={[styles.regionChip, index === regionIndex && styles.regionChipActive]} accessibilityRole="button" accessibilityState={{ selected: index === regionIndex }}><Text style={[styles.regionText, index === regionIndex && styles.regionTextActive]}>{item.region}</Text></TouchableOpacity>)}
    </ScrollView>
    {region.lines.map((line) => <TouchableOpacity key={line.name} style={styles.card} onPress={() => openCrisisLink(line.url)} accessibilityRole="button" accessibilityLabel={`${line.name}, ${line.display}`}>
      <Icon name={line.url.startsWith('sms:') ? 'chatbubble-outline' : 'call-outline'} size={24} color="#fda4af" />
      <View style={styles.cardContent}><Text style={styles.cardTitle}>{line.name}</Text><Text style={styles.cardText}>{line.description}</Text></View>
      <Text style={styles.number}>{line.display}</Text>
    </TouchableOpacity>)}
    <TouchableOpacity style={styles.card} onPress={() => openCrisisLink(FIND_A_HELPLINE_URL)} accessibilityRole="link">
      <Icon name="globe-outline" size={24} color="#60a5fa" />
      <View style={styles.cardContent}><Text style={styles.cardTitle}>Somewhere else?</Text><Text style={styles.cardText}>Find a free, confidential helpline in your country at findahelpline.com</Text></View>
      <Icon name="open-outline" size={18} color="#64748b" />
    </TouchableOpacity>

    <TouchableOpacity style={[styles.card, styles.trustedCard]} onPress={() => navigation.navigate('ReachOut')}>
      <Icon name="people-outline" size={24} color="#60a5fa" />
      <View style={styles.cardContent}><Text style={styles.cardTitle}>Tell someone you trust</Text><Text style={styles.cardText}>You do not need to explain everything. A simple message asking for company can be enough.</Text></View>
      <Icon name="chevron-forward-outline" size={18} color="#64748b" />
    </TouchableOpacity>
    <View style={styles.note}><Text style={styles.noteText}>This wellbeing app supports reflection and self-care. It cannot diagnose, treat, or replace care from a qualified professional, and it does not monitor what you write.</Text></View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 20, paddingBottom: 40 }, title: { color: '#f8fafc', fontSize: 26, fontWeight: '700', marginTop: 12 }, subtitle: { color: '#94a3b8', lineHeight: 21, marginTop: 7 }, urgent: { backgroundColor: '#4c1d2b', borderRadius: 16, padding: 20, marginVertical: 24 }, urgentTitle: { color: '#ffe4e6', fontSize: 17, fontWeight: '700' }, urgentText: { color: '#fecdd3', lineHeight: 21, marginTop: 8 },
  sectionTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '700', marginBottom: 12 }, regions: { gap: 8, paddingBottom: 14 }, regionChip: { borderWidth: 1, borderColor: '#334155', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8 }, regionChipActive: { backgroundColor: '#fda4af', borderColor: '#fda4af' }, regionText: { color: '#cbd5e1', fontSize: 13, fontWeight: '600' }, regionTextActive: { color: '#4c0519' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 16, padding: 18, gap: 14, marginBottom: 12 }, trustedCard: { marginTop: 12 }, cardContent: { flex: 1 }, cardTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700' }, cardText: { color: '#94a3b8', lineHeight: 20, marginTop: 5 }, number: { color: '#fecdd3', fontWeight: '800', fontSize: 14, maxWidth: 110, textAlign: 'right' },
  note: { borderWidth: 1, borderColor: '#334155', borderRadius: 14, padding: 16, marginTop: 14 }, noteText: { color: '#94a3b8', textAlign: 'center', lineHeight: 20, fontSize: 13 },
});
