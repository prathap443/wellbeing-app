import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons as Icon } from '@expo/vector-icons';

export default function ReachOutScreen() {
  const [name, setName] = useState('');
  const [contacts, setContacts] = useState<string[]>([]);

  useEffect(() => { AsyncStorage.getItem('trusted_contacts').then((stored) => { if (stored) setContacts(JSON.parse(stored)); }); }, []);
  const addContact = async () => {
    const value = name.trim();
    if (!value) return;
    const next = [...contacts, value].slice(0, 5);
    await AsyncStorage.setItem('trusted_contacts', JSON.stringify(next)); setContacts(next); setName('');
  };

  return <ScrollView contentContainerStyle={styles.container}>
    <Icon name="chatbubble-ellipses-outline" size={30} color="#60a5fa" /><Text style={styles.title}>Reach out</Text><Text style={styles.subtitle}>A small message can make a hard moment feel less lonely.</Text>
    <View style={styles.messageCard}><Text style={styles.messageLabel}>MESSAGE STARTER</Text><Text style={styles.message}>"Hi, I am having a difficult day. Do you have a few minutes to talk?"</Text><TouchableOpacity onPress={() => Alert.alert('Message ready', 'Copy this message into your preferred messaging app.')}><Text style={styles.copy}>Use this message</Text></TouchableOpacity></View>
    <Text style={styles.sectionTitle}>Trusted contacts</Text><View style={styles.addRow}><TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Add a name" placeholderTextColor="#64748b" /><TouchableOpacity style={styles.addButton} onPress={addContact}><Icon name="add-outline" size={22} color="#fff" /></TouchableOpacity></View>
    {contacts.length === 0 ? <Text style={styles.empty}>Add people you would feel comfortable contacting.</Text> : contacts.map((contact, index) => <TouchableOpacity key={`${contact}-${index}`} style={styles.contact} onPress={() => Alert.alert(`Contact ${contact}`, 'Open your phone or messaging app to reach them.')}><Icon name="person-circle-outline" size={28} color="#60a5fa" /><Text style={styles.contactName}>{contact}</Text><Icon name="chevron-forward-outline" size={18} color="#64748b" /></TouchableOpacity>)}
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 20, paddingBottom: 40 }, title: { color: '#f8fafc', fontSize: 26, fontWeight: '700', marginTop: 12 }, subtitle: { color: '#94a3b8', lineHeight: 21, marginTop: 7 }, messageCard: { backgroundColor: '#172554', borderRadius: 16, padding: 20, marginTop: 26 }, messageLabel: { color: '#93c5fd', fontSize: 11, fontWeight: '700', letterSpacing: 1 }, message: { color: '#eff6ff', fontSize: 17, lineHeight: 25, marginTop: 10 }, copy: { color: '#93c5fd', fontWeight: '700', marginTop: 18 }, sectionTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '700', marginTop: 28, marginBottom: 12 }, addRow: { flexDirection: 'row', gap: 10 }, input: { flex: 1, backgroundColor: '#1e293b', color: '#f8fafc', borderColor: '#334155', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14 }, addButton: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' }, empty: { color: '#64748b', textAlign: 'center', marginTop: 28 }, contact: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1e293b', padding: 15, borderRadius: 14, marginTop: 10 }, contactName: { flex: 1, color: '#f8fafc', fontWeight: '600' },
});
