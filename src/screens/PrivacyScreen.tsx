import { ScrollView, StyleSheet, Text } from 'react-native';
import React from 'react';

// Keep in sync with PRIVACY.md, which is served at /privacy and linked from the App Store listing.
const SECTIONS = [
  ['Summary', 'Your moods, check-ins, journal, plans, habits, therapy notes and contacts are stored only on this device. The AI coach and accounts are optional. We do not sell your data, show ads, or use analytics or tracking.'],
  ['What stays on your device', 'Mood entries, check-ins, journal reflections, plans, habits, meditation progress, therapy companion notes, trusted contacts and settings are saved in this app’s private storage. We cannot access them. If you turn on app lock, Face ID or your passcode is checked by your device; we never receive biometric data.'],
  ['AI coach (optional)', 'Only after you agree, we send your quiz answers, optional first name, mood ratings from the last two weeks, latest sleep, energy and stress scores, and your question (plus up to three earlier questions and replies from today) to our server and to Anthropic, which provides the Claude AI model, to generate a reply. Your notes, journal, therapy notes and contacts are never sent. We do not store or log questions or replies. Anthropic does not use this data to train its models and may keep it for a limited period for safety monitoring. A random install ID, not linked to you, enforces the daily question limit.'],
  ['Account (optional)', 'If you create an account, we store your email, optional first name and a securely hashed password, only to sign you in and keep Wellbeing Plus on your devices. Password reset codes are emailed through Google, stored hashed and expire after 15 minutes. Delete your account any time in Settings → Account → Delete account.'],
  ['Subscriptions', 'Wellbeing Plus is sold through the App Store. Apple processes payment; we never see your card details. RevenueCat confirms your subscription status and receives an anonymous app user ID (or your account ID if signed in) and your purchase history for this app.'],
  ['Who processes data for us', 'Anthropic (AI coach), Replit and Neon (our server and account database), RevenueCat (subscriptions), Google (reset emails) and Apple (App Store). They may process data in the United States under their data protection terms, including Standard Contractual Clauses where required.'],
  ['Legal bases (UK and EU)', 'Explicit consent for the AI coach; contract for your account and Wellbeing Plus; legitimate interests to keep the service secure.'],
  ['Notifications', 'Daily reminders are scheduled on your device. No push notification service receives your data.'],
  ['Deleting your data', 'Use Settings → Clear All Data or delete the app to remove everything on this device. Delete your account in Settings → Account.'],
  ['Your rights', 'You can ask to access, correct, delete or export your data, or withdraw consent, by emailing wellbeingsupport247@gmail.com. You can also complain to your data protection authority (in the UK, the ICO).'],
  ['Age', 'Wellbeing is for adults aged 18 and over.'],
  ['Contact', 'Wellbeing is provided by Prathap Adicherla. Email wellbeingsupport247@gmail.com. The full policy is at wellbeing-app.replit.app/privacy.'],
];

export default function PrivacyScreen() {
  return <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.updated}>Last updated 4 October 2026</Text>
    {SECTIONS.map(([title, body]) => <React.Fragment key={title}><Text style={styles.heading}>{title}</Text><Text style={styles.body}>{body}</Text></React.Fragment>)}
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 20, paddingBottom: 40 },
  updated: { color: '#64748b', fontSize: 12 }, heading: { color: '#f8fafc', fontSize: 16, fontWeight: '700', marginTop: 20 }, body: { color: '#cbd5e1', lineHeight: 21, marginTop: 6 },
});
