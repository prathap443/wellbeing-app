import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useState } from 'react';
import { Ionicons as Icon } from '@expo/vector-icons';

type Plan = 'monthly' | 'annual';

const FEATURES = ['Unlimited guided reflections', 'Therapy companion plans', 'Mood insights and history', 'Private, on-device storage'];

export default function SubscriptionScreen() {
  const [selectedPlan, setSelectedPlan] = useState<Plan>('annual');
  const isAnnual = selectedPlan === 'annual';

  const continueToPayment = () => {
    Alert.alert('Payment setup required', `You selected the ${isAnnual ? 'annual (£40.00)' : 'monthly (£4.99)'} plan. Connect a payment provider to complete subscriptions.`);
  };

  return <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
    <View style={styles.hero}><View style={styles.iconWrap}><Icon name="sparkles" size={28} color="#fef3c7" /></View><Text style={styles.eyebrow}>WELLBEING PLUS</Text><Text style={styles.title}>Make more space{`\n`}for your wellbeing.</Text><Text style={styles.subtitle}>Choose the plan that supports your routine. Cancel any time.</Text></View>
    <View style={styles.featureCard}><Text style={styles.featureHeading}>Everything in Plus</Text>{FEATURES.map((feature) => <View key={feature} style={styles.featureRow}><Icon name="checkmark-circle" size={19} color="#6ee7b7" /><Text style={styles.featureText}>{feature}</Text></View>)}</View>
    <Text style={styles.chooseTitle}>Choose your plan</Text>
    <TouchableOpacity onPress={() => setSelectedPlan('monthly')} style={[styles.plan, !isAnnual && styles.planSelected]} accessibilityRole="radio" accessibilityState={{ selected: !isAnnual }}><View style={styles.planCopy}><Text style={styles.planName}>Monthly</Text><Text style={styles.planDetail}>Flexible, billed every month</Text></View><View style={styles.planPrice}><Text style={styles.price}>£4.99</Text><Text style={styles.period}>per month</Text></View><Icon name={!isAnnual ? 'radio-button-on' : 'radio-button-off'} size={23} color={!isAnnual ? '#34d399' : '#64748b'} /></TouchableOpacity>
    <TouchableOpacity onPress={() => setSelectedPlan('annual')} style={[styles.plan, styles.annualPlan, isAnnual && styles.planSelected]} accessibilityRole="radio" accessibilityState={{ selected: isAnnual }}><View style={styles.bestValue}><Text style={styles.bestValueText}>BEST VALUE</Text></View><View style={styles.planCopy}><Text style={styles.planName}>Annual</Text><Text style={styles.planDetail}>£3.33 per month, billed annually</Text></View><View style={styles.planPrice}><Text style={styles.price}>£40.00</Text><Text style={styles.period}>per year</Text></View><Icon name={isAnnual ? 'radio-button-on' : 'radio-button-off'} size={23} color={isAnnual ? '#34d399' : '#64748b'} /></TouchableOpacity>
    {isAnnual ? <View style={styles.saving}><Icon name="pricetag-outline" size={18} color="#bbf7d0" /><Text style={styles.savingText}>Save £19.88 each year compared with monthly billing.</Text></View> : null}
    <TouchableOpacity style={styles.continueButton} onPress={continueToPayment}><Text style={styles.continueText}>Continue with {isAnnual ? 'annual' : 'monthly'}</Text><Icon name="arrow-forward" size={20} color="#052e2b" /></TouchableOpacity>
    <Text style={styles.terms}>Subscriptions renew automatically unless cancelled. Payment is not configured in this app yet.</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 20, paddingBottom: 42 }, hero: { alignItems: 'center', paddingTop: 14, paddingBottom: 25 }, iconWrap: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: '#713f12', marginBottom: 16 }, eyebrow: { color: '#fde68a', fontSize: 11, letterSpacing: 1.5, fontWeight: '800' }, title: { color: '#f8fafc', textAlign: 'center', fontSize: 29, fontWeight: '800', lineHeight: 35, marginTop: 8 }, subtitle: { color: '#94a3b8', textAlign: 'center', lineHeight: 20, marginTop: 10, maxWidth: 300 },
  featureCard: { backgroundColor: '#172554', borderWidth: 1, borderColor: '#1e3a8a', borderRadius: 17, padding: 18 }, featureHeading: { color: '#dbeafe', fontSize: 15, fontWeight: '800', marginBottom: 13 }, featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 9 }, featureText: { color: '#bfdbfe', fontSize: 13 }, chooseTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '800', marginTop: 26, marginBottom: 11 },
  plan: { position: 'relative', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#334155', backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 11, overflow: 'hidden' }, annualPlan: { borderColor: '#475569' }, planSelected: { borderColor: '#34d399', backgroundColor: '#133c35' }, planCopy: { flex: 1 }, planName: { color: '#f8fafc', fontSize: 16, fontWeight: '800' }, planDetail: { color: '#94a3b8', fontSize: 11, marginTop: 4 }, planPrice: { alignItems: 'flex-end', marginRight: 10 }, price: { color: '#f8fafc', fontSize: 17, fontWeight: '800' }, period: { color: '#94a3b8', fontSize: 10, marginTop: 2 }, bestValue: { position: 'absolute', top: 0, right: 0, backgroundColor: '#fbbf24', borderBottomLeftRadius: 10, paddingHorizontal: 9, paddingVertical: 5 }, bestValueText: { color: '#422006', fontSize: 9, fontWeight: '900', letterSpacing: .6 },
  saving: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#14532d', borderRadius: 12, padding: 13, marginTop: 3 }, savingText: { flex: 1, color: '#bbf7d0', fontSize: 12, lineHeight: 17, fontWeight: '600' }, continueButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#a7f3d0', borderRadius: 27, paddingVertical: 16, marginTop: 23 }, continueText: { color: '#052e2b', fontSize: 16, fontWeight: '800' }, terms: { color: '#64748b', textAlign: 'center', fontSize: 11, lineHeight: 16, marginTop: 15, paddingHorizontal: 12 },
});
