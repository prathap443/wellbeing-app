import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React from 'react';
import { Ionicons as Icon } from '@expo/vector-icons';

export default function SupportGuidanceScreen() {
  return <ScrollView contentContainerStyle={styles.container}>
    <Icon name="heart-outline" size={32} color="#fda4af" /><Text style={styles.title}>Support guidance</Text><Text style={styles.subtitle}>You deserve support. Choose the next safest step for you.</Text>
    <View style={styles.urgent}><Text style={styles.urgentTitle}>If you are in immediate danger</Text><Text style={styles.urgentText}>Call your local emergency number now, or go to the nearest emergency department. If possible, stay with someone you trust.</Text></View>
    <View style={styles.card}><Icon name="call-outline" size={24} color="#60a5fa" /><View style={styles.cardContent}><Text style={styles.cardTitle}>Contact a crisis service</Text><Text style={styles.cardText}>Add country-specific crisis numbers before publishing. Crisis services can provide immediate confidential support.</Text><TouchableOpacity onPress={() => Alert.alert('Crisis resources', 'Add local emergency and crisis-service phone numbers for your users.')}><Text style={styles.link}>Set local resources</Text></TouchableOpacity></View></View>
    <View style={styles.card}><Icon name="people-outline" size={24} color="#60a5fa" /><View style={styles.cardContent}><Text style={styles.cardTitle}>Tell someone you trust</Text><Text style={styles.cardText}>You do not need to explain everything. A simple message asking for company can be enough.</Text></View></View>
    <View style={styles.note}><Text style={styles.noteText}>This wellbeing app supports reflection and self-care. It cannot diagnose, treat, or replace care from a qualified professional.</Text></View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 20, paddingBottom: 40 }, title: { color: '#f8fafc', fontSize: 26, fontWeight: '700', marginTop: 12 }, subtitle: { color: '#94a3b8', lineHeight: 21, marginTop: 7 }, urgent: { backgroundColor: '#4c1d2b', borderRadius: 16, padding: 20, marginVertical: 24 }, urgentTitle: { color: '#ffe4e6', fontSize: 17, fontWeight: '700' }, urgentText: { color: '#fecdd3', lineHeight: 21, marginTop: 8 }, card: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 16, padding: 18, gap: 14, marginBottom: 12 }, cardContent: { flex: 1 }, cardTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700' }, cardText: { color: '#94a3b8', lineHeight: 20, marginTop: 5 }, link: { color: '#93c5fd', fontWeight: '700', marginTop: 14 }, note: { borderWidth: 1, borderColor: '#334155', borderRadius: 14, padding: 16, marginTop: 14 }, noteText: { color: '#94a3b8', textAlign: 'center', lineHeight: 20, fontSize: 13 },
});
