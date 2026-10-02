import { Alert, Linking, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons as Icon } from '@expo/vector-icons';
import { smsUrl } from '../lib/crisis';

type Contact = { name: string; phone?: string };

const MESSAGE = 'Hi, I am having a difficult day. Do you have a few minutes to talk?';

// Older versions stored contacts as plain name strings.
const normalise = (stored: unknown[]): Contact[] => stored.map((item) => (typeof item === 'string' ? { name: item } : (item as Contact)));

export default function ReachOutScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => { AsyncStorage.getItem('trusted_contacts').then((stored) => { if (stored) setContacts(normalise(JSON.parse(stored))); }); }, []);

  const persist = async (next: Contact[]) => { await AsyncStorage.setItem('trusted_contacts', JSON.stringify(next)); setContacts(next); };

  const addContact = async () => {
    const value = name.trim();
    if (!value) return;
    if (contacts.length >= 5) { Alert.alert('Contact limit', 'You can keep up to five trusted contacts. Remove one to add someone new.'); return; }
    await persist([...contacts, { name: value, phone: phone.trim() || undefined }]);
    setName(''); setPhone('');
  };

  const removeContact = (index: number) => Alert.alert('Remove contact', `Remove ${contacts[index].name} from your trusted contacts?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: () => persist(contacts.filter((_, i) => i !== index)) },
  ]);

  const open = (url: string) => Linking.openURL(url).catch(() => Alert.alert('Unable to open', 'Your device could not open this app.'));

  const contactOptions = (contact: Contact, index: number) => {
    if (!contact.phone) {
      Alert.alert(contact.name, 'No phone number saved. You can share the message starter with any app.', [
        { text: 'Share message', onPress: shareMessage },
        { text: 'Remove', style: 'destructive', onPress: () => removeContact(index) },
        { text: 'Close', style: 'cancel' },
      ]);
      return;
    }
    const number = contact.phone.replace(/[^\d+]/g, '');
    Alert.alert(contact.name, contact.phone, [
      { text: 'Send message starter', onPress: () => open(smsUrl(number, MESSAGE)) },
      { text: 'Call', onPress: () => open(`tel:${number}`) },
      { text: 'Remove', style: 'destructive', onPress: () => removeContact(index) },
      { text: 'Close', style: 'cancel' },
    ]);
  };

  const shareMessage = () => { Share.share({ message: MESSAGE }).catch(() => undefined); };

  return <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    <Icon name="chatbubble-ellipses-outline" size={30} color="#60a5fa" /><Text style={styles.title}>Reach out</Text><Text style={styles.subtitle}>A small message can make a hard moment feel less lonely.</Text>
    <View style={styles.messageCard}><Text style={styles.messageLabel}>MESSAGE STARTER</Text><Text style={styles.message}>"{MESSAGE}"</Text><TouchableOpacity onPress={shareMessage} accessibilityRole="button"><Text style={styles.copy}>Send this message</Text></TouchableOpacity></View>
    <Text style={styles.sectionTitle}>Trusted contacts</Text>
    <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Name" placeholderTextColor="#64748b" />
    <View style={styles.addRow}><TextInput style={[styles.input, styles.phoneInput]} value={phone} onChangeText={setPhone} placeholder="Phone number (optional)" placeholderTextColor="#64748b" keyboardType="phone-pad" /><TouchableOpacity style={styles.addButton} onPress={addContact} accessibilityLabel="Add contact"><Icon name="add-outline" size={22} color="#fff" /></TouchableOpacity></View>
    <Text style={styles.hint}>Stored only on this device.</Text>
    {contacts.length === 0 ? <Text style={styles.empty}>Add people you would feel comfortable contacting.</Text> : contacts.map((contact, index) => <TouchableOpacity key={`${contact.name}-${index}`} style={styles.contact} onPress={() => contactOptions(contact, index)}><Icon name="person-circle-outline" size={28} color="#60a5fa" /><View style={styles.contactInfo}><Text style={styles.contactName}>{contact.name}</Text>{contact.phone ? <Text style={styles.contactPhone}>{contact.phone}</Text> : null}</View><Icon name="chevron-forward-outline" size={18} color="#64748b" /></TouchableOpacity>)}
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 20, paddingBottom: 40 }, title: { color: '#f8fafc', fontSize: 26, fontWeight: '700', marginTop: 12 }, subtitle: { color: '#94a3b8', lineHeight: 21, marginTop: 7 }, messageCard: { backgroundColor: '#172554', borderRadius: 16, padding: 20, marginTop: 26 }, messageLabel: { color: '#93c5fd', fontSize: 11, fontWeight: '700', letterSpacing: 1 }, message: { color: '#eff6ff', fontSize: 17, lineHeight: 25, marginTop: 10 }, copy: { color: '#93c5fd', fontWeight: '700', marginTop: 18 }, sectionTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '700', marginTop: 28, marginBottom: 12 }, addRow: { flexDirection: 'row', gap: 10, marginTop: 10 }, input: { backgroundColor: '#1e293b', color: '#f8fafc', borderColor: '#334155', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48 }, phoneInput: { flex: 1 }, addButton: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' }, hint: { color: '#64748b', fontSize: 12, marginTop: 8 }, empty: { color: '#64748b', textAlign: 'center', marginTop: 28 }, contact: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1e293b', padding: 15, borderRadius: 14, marginTop: 10 }, contactInfo: { flex: 1 }, contactName: { color: '#f8fafc', fontWeight: '600' }, contactPhone: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
});
