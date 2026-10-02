import { ActivityIndicator, Alert, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import type { PurchasesPackage } from 'react-native-purchases';
import { buy, getPackages, purchasesAvailable, restore } from '../lib/purchases';
import { useSession } from '../lib/session';

const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

// Only real, delivered benefits: Apple rejects subscriptions that promise things the app doesn't do.
const BENEFITS = [
  ['chatbubbles-outline', '30 AI coach questions a day', 'Free accounts get 5.'],
  ['sync-outline', 'Keep Plus on all your devices', 'Sign in with your Wellbeing account.'],
  ['heart-outline', 'Support an independent wellbeing app', 'Every tool stays free for everyone.'],
];

type Plan = { id: string; title: string; price: string; period: string; detail: string | null; pkg: PurchasesPackage | null };

// Shown only in the browser preview, where the App Store isn't available.
const PREVIEW_PLANS: Plan[] = [
  { id: 'annual', title: 'Annual', price: '£39.99', period: 'per year', detail: '£3.33 per month', pkg: null },
  { id: 'monthly', title: 'Monthly', price: '£4.99', period: 'per month', detail: null, pkg: null },
];

function toPlan(pkg: PurchasesPackage): Plan {
  const annual = pkg.packageType === 'ANNUAL';
  return {
    id: pkg.identifier,
    title: annual ? 'Annual' : pkg.packageType === 'MONTHLY' ? 'Monthly' : pkg.product.title,
    price: pkg.product.priceString,
    period: annual ? 'per year' : pkg.packageType === 'MONTHLY' ? 'per month' : '',
    detail: annual && pkg.product.pricePerMonthString ? `${pkg.product.pricePerMonthString} per month` : null,
    pkg,
  };
}

export default function SubscriptionScreen() {
  const navigation = useNavigation<any>();
  const { plus, user, customerInfo, setCustomerInfo } = useSession();
  const available = purchasesAvailable();
  const [plans, setPlans] = useState<Plan[] | null>(available ? null : PREVIEW_PLANS);
  const [selected, setSelected] = useState<string | null>(available ? null : 'annual');
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!available) return;
    getPackages()
      .then((pkgs) => {
        const next = pkgs.map(toPlan).sort((a, b) => Number(b.title === 'Annual') - Number(a.title === 'Annual'));
        setPlans(next);
        setSelected(next[0]?.id ?? null);
        if (next.length === 0) setMessage('Plans are not available right now. Please try again later.');
      })
      .catch(() => {
        setPlans([]);
        setMessage('Could not load plans. Check your connection and try again.');
      });
  }, [available]);

  const plan = plans?.find((p) => p.id === selected) ?? null;

  const subscribe = async () => {
    if (!plan?.pkg) return;
    setBusy('buy');
    setMessage(null);
    const result = await buy(plan.pkg);
    setBusy(null);
    if (result.status === 'purchased') {
      setCustomerInfo(result.info);
      if (!user) {
        Alert.alert('Welcome to Plus', 'Create a free account to keep Plus on your other devices.', [
          { text: 'Not now', style: 'cancel', onPress: () => navigation.goBack() },
          { text: 'Create account', onPress: () => navigation.navigate('Account') },
        ]);
      }
    } else if (result.status === 'failed') {
      setMessage(result.message);
    }
  };

  const restorePurchases = async () => {
    setBusy('restore');
    setMessage(null);
    try {
      const info = await restore();
      setCustomerInfo(info);
      setMessage(info?.entitlements.active.plus ? 'Your Plus subscription has been restored.' : 'No active subscription was found for this Apple ID.');
    } catch {
      setMessage('Could not restore purchases. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  if (plus) {
    const expires = customerInfo?.entitlements.active.plus?.expirationDate;
    return <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.iconWrap}><Icon name="sparkles" size={28} color="#fef3c7" /></View>
      <Text style={styles.eyebrow}>WELLBEING PLUS</Text>
      <Text style={styles.title}>You're a Plus member</Text>
      <Text style={styles.subtitle}>{expires ? `Renews or ends on ${new Date(expires).toLocaleDateString()}.` : 'Thank you for supporting Wellbeing.'}</Text>
      <View style={styles.featureCard}>{BENEFITS.slice(0, 2).map(([icon, title]) => <View key={title} style={styles.featureRow}><Icon name={icon as any} size={20} color="#6ee7b7" /><Text style={styles.featureTitle}>{title}</Text></View>)}</View>
      <TouchableOpacity style={styles.secondaryButton} onPress={() => Linking.openURL(customerInfo?.managementURL ?? 'https://apps.apple.com/account/subscriptions')}>
        <Text style={styles.secondaryText}>Manage or cancel subscription</Text>
      </TouchableOpacity>
    </ScrollView>;
  }

  return <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
    <View style={styles.iconWrap}><Icon name="sparkles" size={28} color="#fef3c7" /></View>
    <Text style={styles.eyebrow}>WELLBEING PLUS</Text>
    <Text style={styles.title}>More time with your coach</Text>
    <View style={styles.featureCard}>{BENEFITS.map(([icon, title, text]) => <View key={title} style={styles.featureRow}>
      <Icon name={icon as any} size={20} color="#6ee7b7" />
      <View style={styles.featureBody}><Text style={styles.featureTitle}>{title}</Text><Text style={styles.featureText}>{text}</Text></View>
    </View>)}</View>

    {plans === null ? <ActivityIndicator color="#34d399" style={styles.loader} /> : plans.map((p) => {
      const isSelected = p.id === selected;
      return <TouchableOpacity key={p.id} onPress={() => setSelected(p.id)} style={[styles.plan, isSelected && styles.planSelected]} accessibilityRole="radio" accessibilityState={{ selected: isSelected }}>
        {p.title === 'Annual' ? <View style={styles.bestValue}><Text style={styles.bestValueText}>BEST VALUE</Text></View> : null}
        <View style={styles.planCopy}><Text style={styles.planName}>{p.title}</Text>{p.detail ? <Text style={styles.planDetail}>{p.detail}</Text> : null}</View>
        <View style={styles.planPrice}><Text style={styles.price}>{p.price}</Text><Text style={styles.period}>{p.period}</Text></View>
        <Icon name={isSelected ? 'radio-button-on' : 'radio-button-off'} size={23} color={isSelected ? '#34d399' : '#64748b'} />
      </TouchableOpacity>;
    })}

    {message ? <Text style={styles.message}>{message}</Text> : null}

    <TouchableOpacity style={[styles.cta, (!available || !plan?.pkg || !!busy) && styles.ctaDisabled]} disabled={!available || !plan?.pkg || !!busy} onPress={subscribe} accessibilityRole="button">
      {busy === 'buy' ? <ActivityIndicator color="#052e2b" /> : <Text style={styles.ctaText}>{available ? `Subscribe${plan ? ` for ${plan.price}` : ''}` : 'Available in the iPhone app'}</Text>}
    </TouchableOpacity>
    {!available && Platform.OS === 'web' ? <Text style={styles.previewNote}>This is a browser preview. Purchases work in the iOS app through the App Store.</Text> : null}

    <TouchableOpacity onPress={restorePurchases} disabled={!available || !!busy} style={styles.restore}>
      {busy === 'restore' ? <ActivityIndicator color="#94a3b8" /> : <Text style={styles.restoreText}>Restore purchases</Text>}
    </TouchableOpacity>

    <Text style={styles.terms}>
      Payment is charged to your Apple ID at confirmation. The subscription renews automatically at the same price unless cancelled at least 24 hours before the end of the current period. Manage or cancel anytime in your App Store account settings.
    </Text>
    <View style={styles.links}>
      <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}><Text style={styles.link}>Terms of Use</Text></TouchableOpacity>
      <Text style={styles.linkDivider}>·</Text>
      <TouchableOpacity onPress={() => navigation.navigate('Privacy')}><Text style={styles.link}>Privacy Policy</Text></TouchableOpacity>
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 20, paddingBottom: 40 },
  iconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#78350f', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: '#fcd34d', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginTop: 16 },
  title: { color: '#f8fafc', fontSize: 28, fontWeight: '800', marginTop: 6 }, subtitle: { color: '#94a3b8', lineHeight: 21, marginTop: 8 },
  featureCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginTop: 20, marginBottom: 18, gap: 14 },
  featureRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' }, featureBody: { flex: 1 },
  featureTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '700' }, featureText: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  loader: { marginVertical: 30 },
  plan: { position: 'relative', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#334155', backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 11, overflow: 'hidden' },
  planSelected: { borderColor: '#34d399', backgroundColor: '#133c35' }, planCopy: { flex: 1 },
  planName: { color: '#f8fafc', fontSize: 16, fontWeight: '800' }, planDetail: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  planPrice: { alignItems: 'flex-end', marginRight: 10 }, price: { color: '#f8fafc', fontSize: 17, fontWeight: '800' }, period: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  bestValue: { position: 'absolute', top: 0, right: 0, backgroundColor: '#fbbf24', borderBottomLeftRadius: 10, paddingHorizontal: 9, paddingVertical: 4 }, bestValueText: { color: '#422006', fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  message: { color: '#fde68a', textAlign: 'center', marginTop: 6, lineHeight: 19 },
  cta: { backgroundColor: '#34d399', borderRadius: 28, paddingVertical: 16, alignItems: 'center', marginTop: 14 }, ctaDisabled: { backgroundColor: '#334155' }, ctaText: { color: '#052e2b', fontWeight: '800', fontSize: 16 },
  previewNote: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 8 },
  restore: { alignItems: 'center', padding: 14 }, restoreText: { color: '#94a3b8', fontWeight: '600' },
  terms: { color: '#64748b', fontSize: 11, lineHeight: 16, textAlign: 'center' },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 }, link: { color: '#93c5fd', fontSize: 12, fontWeight: '600' }, linkDivider: { color: '#475569' },
  secondaryButton: { borderWidth: 1, borderColor: '#334155', borderRadius: 24, paddingVertical: 14, alignItems: 'center' }, secondaryText: { color: '#e2e8f0', fontWeight: '700' },
});
