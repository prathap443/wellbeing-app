import { ScrollView, StyleSheet, Text } from 'react-native';
import React from 'react';

// Keep in sync with PRIVACY.md, which is the public copy for the App Store listing.
const SECTIONS = [
  ['Summary', 'Wellbeing does not sell your data and has no account, analytics or advertising. Everything stays on your device unless you choose to use the AI coach.'],
  ['What is stored', 'Mood entries, check-ins, journal reflections, plans, habits, meditation progress, trusted contacts and settings are saved only in this app’s private storage on your device.'],
  ['Who can see it', 'Only you. We have no servers and cannot access your entries. If you turn on app lock, Face ID or your passcode is checked by your device; we never receive biometric data.'],
  ['AI coach (optional)', 'If you agree to use the AI coach, the choices you made in its short quiz, an optional first name, your recent mood ratings and check-in scores, and the question you tap are sent to our coach server and to Anthropic, which provides the Claude AI model, to generate a reply. Your notes, journal entries and contacts are never sent. Our server does not store questions or answers or link them to you; it keeps only an anonymous per-install counter for the daily question limit. Anthropic processes requests under its commercial terms and may retain them for a limited period for safety and abuse monitoring; it does not use them to train models.'],
  ['Notifications', 'Daily reminders are scheduled locally on your device. No push notification service receives your data.'],
  ['Sharing', 'Data leaves your device only when you choose to: for example using Export Data, sending a message to a trusted contact, or calling a helpline.'],
  ['Deleting your data', 'Use Settings → Clear All Data, or delete the app. Both permanently remove everything stored by Wellbeing on this device.'],
  ['Children', 'Wellbeing is not directed at children under 13.'],
  ['Changes', 'If this policy changes, the updated version will be published with the app update.'],
  ['Contact', 'Questions? Use the support link on the Wellbeing App Store page.'],
];

export default function PrivacyScreen() {
  return <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.updated}>Last updated 2 October 2026 (AI coach added)</Text>
    {SECTIONS.map(([title, body]) => <React.Fragment key={title}><Text style={styles.heading}>{title}</Text><Text style={styles.body}>{body}</Text></React.Fragment>)}
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 20, paddingBottom: 40 },
  updated: { color: '#64748b', fontSize: 12 }, heading: { color: '#f8fafc', fontSize: 16, fontWeight: '700', marginTop: 20 }, body: { color: '#cbd5e1', lineHeight: 21, marginTop: 6 },
});
